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
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;

    // Get users active today (simplified - check presence or recent activity)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);
    
    const activeQuery = query(
      collection(db, 'presence'),
      where('lastSeen', '>=', todayTimestamp)
    );
    const activeSnapshot = await getDocs(activeQuery);
    const activeToday = activeSnapshot.size;

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

    return {
      totalUsers,
      activeToday,
      weeklyGrowth,
      kFactor,
      pendingFraud,
      activeExperiments,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
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

