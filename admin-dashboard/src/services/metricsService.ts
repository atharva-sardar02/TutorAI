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
 * Fetch funnel metrics (mock for now)
 */
export async function getFunnelMetrics(): Promise<FunnelMetrics> {
  return {
    stages: [
      { stage: 'Visited Landing', count: 1000, conversionRate: 100, dropoffRate: 0 },
      { stage: 'Started Signup', count: 600, conversionRate: 60, dropoffRate: 40 },
      { stage: 'Completed Profile', count: 450, conversionRate: 45, dropoffRate: 15 },
      { stage: 'First Session', count: 350, conversionRate: 35, dropoffRate: 10 },
      { stage: 'Active User', count: 280, conversionRate: 28, dropoffRate: 7 },
    ],
    totalEntered: 1000,
    totalConverted: 280,
    overallConversionRate: 28,
    avgTimeToConvert: 3.5,
  };
}

/**
 * Fetch retention metrics (mock for now)
 */
export async function getRetentionMetrics(): Promise<RetentionMetrics> {
  return {
    cohorts: [
      {
        cohortDate: '2025-10-01',
        size: 100,
        retention: [
          { day: 1, retained: 85, retentionRate: 85 },
          { day: 7, retained: 65, retentionRate: 65 },
          { day: 14, retained: 55, retentionRate: 55 },
          { day: 30, retained: 45, retentionRate: 45 },
        ],
      },
      {
        cohortDate: '2025-10-15',
        size: 120,
        retention: [
          { day: 1, retained: 100, retentionRate: 83.3 },
          { day: 7, retained: 80, retentionRate: 66.7 },
          { day: 14, retained: 70, retentionRate: 58.3 },
        ],
      },
    ],
    overallRetention: [
      { day: 1, avgRetentionRate: 84 },
      { day: 7, avgRetentionRate: 66 },
      { day: 14, avgRetentionRate: 57 },
      { day: 30, avgRetentionRate: 45 },
    ],
  };
}

/**
 * Fetch percentile statistics from users collection
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

    // Mock distribution and summary
    return {
      distribution: [
        { percentile: 90, count: 15, role: 'tutor' },
        { percentile: 75, count: 25, role: 'tutor' },
        { percentile: 50, count: 50, role: 'tutor' },
        { percentile: 25, count: 25, role: 'tutor' },
        { percentile: 10, count: 10, role: 'tutor' },
      ],
      summary: [
        { role: 'tutor', totalUsers: tutors.length, avgXp: 1500, medianXp: 1200, top10PercentXp: 3500 },
        { role: 'parent', totalUsers: parents.length, avgXp: 1200, medianXp: 1000, top10PercentXp: 3000 },
      ],
      xpTrends: [],
    };
  } catch (error) {
    console.error('Error fetching percentile stats:', error);
    throw error;
  }
}

