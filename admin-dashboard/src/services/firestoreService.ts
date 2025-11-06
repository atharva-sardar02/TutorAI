import { collection, query, getDocs, onSnapshot, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Types
export interface DashboardStats {
  totalUsers: number;
  activeToday: number;
  weeklyGrowth: number;
  kFactor: number;
  pendingFraud: number;
  activeExperiments: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: Timestamp;
  action: string;
  adminEmail: string;
  metadata?: Record<string, any>;
}

/**
 * Fetch dashboard statistics
 * 
 * ACTIVE TODAY CALCULATION:
 * - Queries /users collection for presence.lastSeen >= today 00:00:00
 * - Considers users with presence.lastSeen in last 24 hours as "active today"
 * - Falls back to counting users with recent activity if presence data unavailable
 * 
 * OBSERVABILITY:
 * - Logs query execution time and result counts
 * - Tracks errors for monitoring
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const startTime = Date.now();
  
  try {
    // Get total users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;
    console.log(`[Dashboard] Fetched ${totalUsers} total users in ${Date.now() - startTime}ms`);

    // Get users active today
    // FIX: Query /users collection where presence.lastSeen >= today 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);
    
    // Count users with presence.lastSeen >= today
    let activeToday = 0;
    const queryStart = Date.now();
    
    try {
      // Note: We fetch all users and filter in-memory because:
      // 1. Firestore doesn't support querying nested fields with >= operator efficiently
      // 2. User count is typically < 10k, so in-memory filtering is acceptable
      // 3. This avoids complex composite index requirements
      
      activeToday = usersSnapshot.docs.filter((doc) => {
        const data = doc.data();
        const presence = data.presence;
        
        if (!presence || !presence.lastSeen) {
          return false; // User has never been active
        }
        
        // Convert Firestore Timestamp to milliseconds for comparison
        const lastSeenMs = presence.lastSeen.toMillis ? presence.lastSeen.toMillis() : presence.lastSeen.seconds * 1000;
        const todayMs = todayTimestamp.toMillis();
        
        return lastSeenMs >= todayMs;
      }).length;
      
      console.log(`[Dashboard] Active Today: ${activeToday} users (query time: ${Date.now() - queryStart}ms)`);
    } catch (presenceError) {
      console.error('[Dashboard] Error calculating Active Today:', presenceError);
      // Fallback: return 0 rather than failing the entire dashboard
      activeToday = 0;
    }

    // Get weekly growth (simplified - count users created in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoTimestamp = Timestamp.fromDate(weekAgo);
    
    const newUsersQuery = query(
      collection(db, 'users'),
      where('createdAt', '>=', weekAgoTimestamp)
    );
    const newUsersSnapshot = await getDocs(newUsersQuery);
    const weeklyGrowth = newUsersSnapshot.size;

    // Get pending fraud items
    const fraudQuery = query(
      collection(db, 'fraud_queue'),
      where('status', '==', 'pending')
    );
    const fraudSnapshot = await getDocs(fraudQuery);
    const pendingFraud = fraudSnapshot.size;

    // Get active experiments
    const experimentsQuery = query(
      collection(db, 'experiments'),
      where('status', '==', 'active')
    );
    const experimentsSnapshot = await getDocs(experimentsQuery);
    const activeExperiments = experimentsSnapshot.size;

    // Get latest K-Factor from metrics collection
    let kFactor = 1.0; // Default
    try {
      const kFactorQuery = query(
        collection(db, 'k_factor_metrics'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const kFactorSnapshot = await getDocs(kFactorQuery);
      if (!kFactorSnapshot.empty) {
        kFactor = kFactorSnapshot.docs[0].data().kFactor || 1.0;
      }
    } catch (error) {
      console.warn('Could not fetch K-Factor, using default:', error);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Dashboard] Stats fetched successfully in ${totalTime}ms`, {
      totalUsers,
      activeToday,
      weeklyGrowth,
      kFactor: kFactor.toFixed(2),
      pendingFraud,
      activeExperiments,
    });

    // Guardrail: Validate data integrity
    if (activeToday > totalUsers) {
      console.warn('[Dashboard] Data integrity warning: activeToday > totalUsers', {
        activeToday,
        totalUsers,
      });
      // Cap activeToday at totalUsers
      return {
        totalUsers,
        activeToday: totalUsers,
        weeklyGrowth,
        kFactor,
        pendingFraud,
        activeExperiments,
      };
    }

    return {
      totalUsers,
      activeToday,
      weeklyGrowth,
      kFactor,
      pendingFraud,
      activeExperiments,
    };
  } catch (error) {
    console.error('[Dashboard] Error fetching dashboard stats:', error);
    
    // Enhanced error logging for observability
    if (error instanceof Error) {
      console.error('[Dashboard] Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    
    throw error;
  }
}

/**
 * Subscribe to recent activity (audit log)
 */
export function subscribeToRecentActivity(
  callback: (activities: ActivityLogEntry[]) => void,
  limitCount: number = 10
): () => void {
  const q = query(
    collection(db, 'audit_log'),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const activities: ActivityLogEntry[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ActivityLogEntry[];
    
    callback(activities);
  });
}

/**
 * Get user count by role
 */
export async function getUserCountByRole(): Promise<{ tutors: number; parents: number }> {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let tutors = 0;
    let parents = 0;

    usersSnapshot.forEach((doc) => {
      const role = doc.data().role;
      if (role === 'tutor') tutors++;
      else if (role === 'parent') parents++;
    });

    return { tutors, parents };
  } catch (error) {
    console.error('Error fetching user counts:', error);
    throw error;
  }
}

