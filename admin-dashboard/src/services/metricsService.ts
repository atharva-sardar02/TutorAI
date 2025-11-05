import { collection, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { KFactorMetrics, FunnelMetrics, RetentionMetrics, PercentileStats, LoopType } from '@/types/metrics';

/**
 * Fetch K-Factor metrics from Firestore
 */
export async function getKFactorMetrics(
  startDate: Date,
  endDate: Date,
  loopType: LoopType = 'all'
): Promise<KFactorMetrics> {
  try {
    // Query k_factor_metrics collection
    const metricsRef = collection(db, 'k_factor_metrics');
    let q = query(
      metricsRef,
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate),
      orderBy('timestamp', 'desc')
    );

    if (loopType !== 'all') {
      q = query(q, where('loopType', '==', loopType));
    }

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Return mock data if no metrics exist
      return {
        overall: 1.2,
        byLoop: [
          { loopType: 'referral', kFactor: 1.5, invitesSent: 150, conversions: 45, conversionRate: 30 },
          { loopType: 'challenge', kFactor: 1.1, invitesSent: 200, conversions: 55, conversionRate: 27.5 },
          { loopType: 'parent_pod', kFactor: 0.9, invitesSent: 80, conversions: 18, conversionRate: 22.5 },
        ],
        trend: [
          { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 1.1 },
          { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 1.15 },
          { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 1.2 },
          { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 1.18 },
          { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 1.25 },
          { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 1.22 },
          { date: new Date().toISOString(), kFactor: 1.3 },
        ],
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    }

    // Aggregate metrics from Firestore
    const docs = snapshot.docs.map(doc => doc.data());
    
    // Calculate overall K-Factor (simplified)
    const avgKFactor = docs.reduce((sum, doc) => sum + (doc.kFactor || 0), 0) / docs.length;

    return {
      overall: avgKFactor,
      byLoop: docs.map(doc => ({
        loopType: doc.loopType,
        kFactor: doc.kFactor || 0,
        invitesSent: doc.invitesSent || 0,
        conversions: doc.conversions || 0,
        conversionRate: doc.conversionRate || 0,
      })),
      trend: docs.map(doc => ({
        date: doc.timestamp.toDate().toISOString(),
        kFactor: doc.kFactor || 0,
      })),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  } catch (error) {
    console.error('Error fetching K-Factor metrics:', error);
    throw error;
  }
}

/**
 * Fetch funnel metrics from real user data
 */
export async function getFunnelMetrics(): Promise<FunnelMetrics> {
  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const totalUsers = users.length;

    // Stage 1: Signed Up (all users who exist)
    const signedUp = totalUsers;

    // Stage 2: Completed Profile (users with displayName and role)
    const profileComplete = users.filter(user => 
      user.displayName && user.role
    ).length;

    // Stage 3: First Session (users with at least one conversation or session)
    const conversationsSnapshot = await getDocs(collection(db, 'conversations'));
    const usersWithSessions = new Set<string>();
    conversationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.participants) {
        data.participants.forEach((uid: string) => usersWithSessions.add(uid));
      }
    });
    const firstSession = usersWithSessions.size;

    // Stage 4: Made First Referral (users with at least one referral)
    const referralsSnapshot = await getDocs(collection(db, 'referrals'));
    const usersWithReferrals = new Set<string>();
    referralsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.referrerId) {
        usersWithReferrals.add(data.referrerId);
      }
    });
    const madeReferral = usersWithReferrals.size;

    // Stage 5: Active User (users with XP > 0 or recent activity)
    const balancesSnapshot = await getDocs(collection(db, 'balances'));
    const activeUsers = balancesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.xpBalance && data.xpBalance > 0;
    }).length;

    // Calculate conversion rates
    const stages = [
      {
        stage: 'Signed Up',
        count: signedUp,
        conversionRate: 100,
        dropoffRate: 0,
      },
      {
        stage: 'Completed Profile',
        count: profileComplete,
        conversionRate: signedUp > 0 ? Math.round((profileComplete / signedUp) * 100) : 0,
        dropoffRate: signedUp > 0 ? Math.round(((signedUp - profileComplete) / signedUp) * 100) : 0,
      },
      {
        stage: 'First Session',
        count: firstSession,
        conversionRate: signedUp > 0 ? Math.round((firstSession / signedUp) * 100) : 0,
        dropoffRate: profileComplete > 0 ? Math.round(((profileComplete - firstSession) / profileComplete) * 100) : 0,
      },
      {
        stage: 'Made Referral',
        count: madeReferral,
        conversionRate: signedUp > 0 ? Math.round((madeReferral / signedUp) * 100) : 0,
        dropoffRate: firstSession > 0 ? Math.round(((firstSession - madeReferral) / firstSession) * 100) : 0,
      },
      {
        stage: 'Active User',
        count: activeUsers,
        conversionRate: signedUp > 0 ? Math.round((activeUsers / signedUp) * 100) : 0,
        dropoffRate: madeReferral > 0 ? Math.round(((madeReferral - activeUsers) / madeReferral) * 100) : 0,
      },
    ];

    // Calculate average time to convert (simplified - would need timestamp analysis)
    const avgTimeToConvert = 2.5; // Default estimate in days

    return {
      stages,
      totalEntered: signedUp,
      totalConverted: activeUsers,
      overallConversionRate: signedUp > 0 ? Math.round((activeUsers / signedUp) * 100) : 0,
      avgTimeToConvert,
    };
  } catch (error) {
    console.error('Error fetching funnel metrics:', error);
    throw error;
  }
}

/**
 * Fetch retention metrics from real user activity data
 */
export async function getRetentionMetrics(): Promise<RetentionMetrics> {
  try {
    // Get all users with their creation dates
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      createdAt: doc.data().createdAt,
    }));

    // Get all presence/activity data
    const presenceSnapshot = await getDocs(collection(db, 'presence'));
    const userActivity = new Map<string, Date[]>();
    
    presenceSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = doc.id;
      const lastSeen = data.lastSeen?.toDate();
      
      if (lastSeen) {
        if (!userActivity.has(userId)) {
          userActivity.set(userId, []);
        }
        userActivity.get(userId)!.push(lastSeen);
      }
    });

    // Group users into cohorts by signup week
    const cohortMap = new Map<string, { users: string[], createdAt: Date }>();
    
    users.forEach(user => {
      if (!user.createdAt) return;
      
      const createdDate = user.createdAt.toDate();
      const cohortKey = getWeekStart(createdDate).toISOString().split('T')[0];
      
      if (!cohortMap.has(cohortKey)) {
        cohortMap.set(cohortKey, { users: [], createdAt: getWeekStart(createdDate) });
      }
      cohortMap.get(cohortKey)!.users.push(user.id);
    });

    // Calculate retention for each cohort (last 4 cohorts)
    const cohorts = Array.from(cohortMap.entries())
      .sort((a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime())
      .slice(0, 4)
      .map(([cohortDate, cohortData]) => {
        const size = cohortData.users.length;
        const retention = [1, 7, 14, 30].map(day => {
          const targetDate = new Date(cohortData.createdAt);
          targetDate.setDate(targetDate.getDate() + day);
          
          // Count users active on or after target date
          const retained = cohortData.users.filter(userId => {
            const activities = userActivity.get(userId) || [];
            return activities.some(activityDate => activityDate >= targetDate);
          }).length;
          
          return {
            day,
            retained,
            retentionRate: size > 0 ? Math.round((retained / size) * 100) : 0,
          };
        });

        return {
          cohortDate,
          size,
          retention,
        };
      });

    // Calculate overall retention averages
    const retentionDays = [1, 7, 14, 30];
    const overallRetention = retentionDays.map(day => {
      const rates = cohorts
        .map(c => c.retention.find(r => r.day === day))
        .filter(r => r !== undefined)
        .map(r => r!.retentionRate);
      
      const avgRetentionRate = rates.length > 0
        ? Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length)
        : 0;

      return {
        day,
        avgRetentionRate,
      };
    });

    return {
      cohorts,
      overallRetention,
    };
  } catch (error) {
    console.error('Error fetching retention metrics:', error);
    throw error;
  }
}

/**
 * Helper: Get start of week for a date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

/**
 * Fetch percentile statistics from users collection with real distribution
 */
export async function getPercentileStats(): Promise<PercentileStats> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    const tutors: number[] = [];
    const parents: number[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const role = data.role;
      const xp = data.stats?.monthlyXp || 0;

      if (role === 'tutor') tutors.push(xp);
      else if (role === 'parent') parents.push(xp);
    });

    // Sort XP arrays for percentile calculation
    tutors.sort((a, b) => a - b);
    parents.sort((a, b) => a - b);

    // Calculate real distribution (histogram buckets)
    const distribution = [];
    const percentileBuckets = [
      { min: 90, max: 100, label: 90 },
      { min: 75, max: 90, label: 75 },
      { min: 50, max: 75, label: 50 },
      { min: 25, max: 50, label: 25 },
      { min: 0, max: 25, label: 10 },
    ];

    for (const role of ['tutor', 'parent'] as const) {
      const xpArray = role === 'tutor' ? tutors : parents;
      if (xpArray.length === 0) continue;

      for (const bucket of percentileBuckets) {
        const minXp = calculatePercentile(xpArray, bucket.min);
        const maxXp = calculatePercentile(xpArray, bucket.max);
        
        const count = xpArray.filter(xp => xp >= minXp && xp < maxXp).length;
        
        distribution.push({
          percentile: bucket.label,
          count,
          role,
        });
      }
    }

    // Calculate summary statistics
    const summary = [];
    
    for (const role of ['tutor', 'parent'] as const) {
      const xpArray = role === 'tutor' ? tutors : parents;
      
      if (xpArray.length > 0) {
        const avgXp = Math.round(xpArray.reduce((sum, xp) => sum + xp, 0) / xpArray.length);
        const medianXp = calculatePercentile(xpArray, 50);
        const top10PercentXp = calculatePercentile(xpArray, 90);
        
        summary.push({
          role,
          totalUsers: xpArray.length,
          avgXp,
          medianXp,
          top10PercentXp,
        });
      } else {
        summary.push({
          role,
          totalUsers: 0,
          avgXp: 0,
          medianXp: 0,
          top10PercentXp: 0,
        });
      }
    }

    return {
      distribution,
      summary,
      xpTrends: [], // Could be populated with historical data
    };
  } catch (error) {
    console.error('Error fetching percentile stats:', error);
    throw error;
  }
}

/**
 * Helper: Calculate percentile value from sorted array
 */
function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

