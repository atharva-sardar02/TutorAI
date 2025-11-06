import { collection, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';
import type { KFactorMetrics, FunnelMetrics, RetentionMetrics, PercentileStats, LoopType } from '@/types/metrics';

/**
 * Fetch K-Factor metrics from Firestore
 * 
 * DATA PRIORITY:
 * 1. Real data from experiment_metrics (aggregated)
 * 2. Demo data ONLY if: no real data exists AND filters are (last 7 days + "all loops")
 * 3. Otherwise: return empty state
 * 
 * K-FACTOR COMPUTATION:
 * - Aggregates across all active experiments and variants
 * - K-Factor = (invites per user) × (joins per invite)
 * - Stored in experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}
 */
export async function getKFactorMetrics(
  startDate: Date,
  endDate: Date,
  loopType: LoopType = 'all'
): Promise<KFactorMetrics> {
  const queryStart = Date.now();
  
  try {
    console.log(`[K-Factor] Fetching metrics for range: ${startDate.toISOString()} to ${endDate.toISOString()}, loop: ${loopType}`);

    // First, check for real data in experiments collection
    const experimentsRef = collection(db, 'experiments');
    const experimentsQuery = query(experimentsRef, where('status', '==', 'active'));
    const experimentsSnapshot = await getDocs(experimentsQuery);
    
    if (experimentsSnapshot.empty) {
      console.log('[K-Factor] No active experiments found');
      return getEmptyOrDemoData(startDate, endDate, loopType);
    }
    
    console.log(`[K-Factor] Found ${experimentsSnapshot.size} active experiments`);
    
    // Fetch metrics from all experiments
    const allMetrics: any[] = [];
    const experiments = experimentsSnapshot.docs;
    
    for (const expDoc of experiments) {
      const expData = expDoc.data();
      const experimentId = expData.experimentId || expDoc.id;
      const experimentLoopType = expData.loopType || 'unknown';
      
      // Skip if filtering by loop type and this doesn't match
      if (loopType !== 'all' && experimentLoopType !== loopType) {
        continue;
      }
      
      // Get all variants for this experiment
      const variants = expData.variants || [];
      
      for (const variant of variants) {
        const variantId = variant.variantId;
        
        try {
          // Query daily metrics for this variant
          const dailyRef = collection(
            db, 
            'experiment_metrics', 
            experimentId, 
            'variants', 
            variantId, 
            'daily'
          );
          
          const dailyQuery = query(
            dailyRef,
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'asc')
          );
          
          const dailySnapshot = await getDocs(dailyQuery);
          
          dailySnapshot.docs.forEach(doc => {
            const data = doc.data();
            allMetrics.push({
              ...data,
              loopType: experimentLoopType,
              experimentId,
              variantId,
            });
          });
        } catch (error: any) {
          console.warn(`[K-Factor] Error fetching metrics for ${experimentId}/${variantId}:`, error.message);
        }
      }
    }
    
    console.log(`[K-Factor] Retrieved ${allMetrics.length} metric documents (query time: ${Date.now() - queryStart}ms)`);
    
    if (allMetrics.length === 0) {
      console.log('[K-Factor] No metrics data found');
      return getEmptyOrDemoData(startDate, endDate, loopType);
    }
    
    // Aggregate real data
    return aggregateKFactorMetrics(allMetrics, startDate, endDate, loopType);
    
  } catch (error) {
    console.error('[K-Factor] Error fetching metrics:', error);
    throw error;
  }
}

/**
 * Aggregate K-Factor metrics from experiment data
 */
function aggregateKFactorMetrics(
  metrics: any[],
  startDate: Date,
  endDate: Date,
  loopType: LoopType
): KFactorMetrics {
  // Group by loop type
  const byLoopMap = new Map<string, { totalKFactor: number; count: number; invites: number; joins: number; users: number }>();
  const trendByDate = new Map<string, { totalKFactor: number; count: number }>();
  
  metrics.forEach(metric => {
    const loop = metric.loopType || 'unknown';
    const kFactor = metric.kFactor || 0;
    const stats = metric.stats || {};
    
    // Aggregate by loop type
    if (!byLoopMap.has(loop)) {
      byLoopMap.set(loop, { totalKFactor: 0, count: 0, invites: 0, joins: 0, users: 0 });
    }
    const loopData = byLoopMap.get(loop)!;
    loopData.totalKFactor += kFactor;
    loopData.count += 1;
    loopData.invites += stats.invites || 0;
    loopData.joins += stats.joins || 0;
    loopData.users += stats.users || 0;
    
    // Aggregate by date for trend
    const dateStr = metric.date?.toDate ? metric.date.toDate().toISOString() : new Date().toISOString();
    if (!trendByDate.has(dateStr)) {
      trendByDate.set(dateStr, { totalKFactor: 0, count: 0 });
    }
    const dateData = trendByDate.get(dateStr)!;
    dateData.totalKFactor += kFactor;
    dateData.count += 1;
  });
  
  // Calculate by-loop metrics
  const byLoop = Array.from(byLoopMap.entries()).map(([loopType, data]) => ({
    loopType,
    kFactor: data.count > 0 ? data.totalKFactor / data.count : 0,
    invitesSent: data.invites,
    conversions: data.joins,
    conversionRate: data.invites > 0 ? (data.joins / data.invites) * 100 : 0,
  }));
  
  // Calculate overall K-Factor (weighted average)
  const overallKFactor = byLoop.length > 0
    ? byLoop.reduce((sum, loop) => sum + loop.kFactor, 0) / byLoop.length
    : 0;
  
  // Calculate trend
  const trend = Array.from(trendByDate.entries())
    .map(([date, data]) => ({
      date,
      kFactor: data.count > 0 ? data.totalKFactor / data.count : 0,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  console.log(`[K-Factor] Aggregated data: overall=${overallKFactor.toFixed(2)}, loops=${byLoop.length}, trend points=${trend.length}`);
  
  return {
    overall: overallKFactor,
    byLoop,
    trend,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    isRealData: true, // Flag to indicate real data
  };
}

/**
 * Return empty state or demo data based on filters
 * Demo data ONLY for: last 7 days + "all" filter
 */
function getEmptyOrDemoData(
  startDate: Date,
  endDate: Date,
  loopType: LoopType
): KFactorMetrics {
  // Check if request is for last 7 days
  const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const isLast7Days = daysDiff >= 6 && daysDiff <= 8; // Allow small variance
  
  // Demo data ONLY if: last 7 days AND "all" filter
  if (isLast7Days && loopType === 'all') {
    console.log('[K-Factor] Returning demo data (no real data, last 7 days, all loops)');
    
    return {
      overall: 1.0,
      byLoop: [
        { loopType: 'referral', kFactor: 1.5, invitesSent: 150, conversions: 45, conversionRate: 30 },
        { loopType: 'challenge', kFactor: 1.1, invitesSent: 200, conversions: 55, conversionRate: 27.5 },
        { loopType: 'parent_pod', kFactor: 0.9, invitesSent: 80, conversions: 18, conversionRate: 22.5 },
      ],
      trend: [
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 0.95 },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 0.98 },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 1.02 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 0.97 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 1.05 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), kFactor: 1.01 },
        { date: new Date().toISOString(), kFactor: 1.0 },
      ],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isRealData: false, // Flag to indicate demo data
    };
  }
  
  // Return empty state for all other filter combinations
  console.log('[K-Factor] Returning empty state (no data available for this filter)');
  
  return {
    overall: 0,
    byLoop: [],
    trend: [],
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    isRealData: false,
  };
}

/**
 * Fetch funnel metrics from real user data
 * Falls back to demo data if permission errors occur
 */
export async function getFunnelMetrics(): Promise<FunnelMetrics> {
  const startTime = Date.now();
  
  try {
    console.log('[Funnel Metrics] Starting fetch...');
    
    // Get all users
    console.log('[Funnel Metrics] Querying users collection...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`[Funnel Metrics] Retrieved ${usersSnapshot.size} users`);
    
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
    console.log('[Funnel Metrics] Querying conversations collection...');
    const conversationsSnapshot = await getDocs(collection(db, 'conversations'));
    console.log(`[Funnel Metrics] Retrieved ${conversationsSnapshot.size} conversations`);
    
    const usersWithSessions = new Set<string>();
    conversationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.participants) {
        data.participants.forEach((uid: string) => usersWithSessions.add(uid));
      }
    });
    const firstSession = usersWithSessions.size;

    // Stage 4: Made First Referral (users with at least one referral)
    console.log('[Funnel Metrics] Querying referrals collection...');
    const referralsSnapshot = await getDocs(collection(db, 'referrals'));
    console.log(`[Funnel Metrics] Retrieved ${referralsSnapshot.size} referrals`);
    
    const usersWithReferrals = new Set<string>();
    referralsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.referrerId) {
        usersWithReferrals.add(data.referrerId);
      }
    });
    const madeReferral = usersWithReferrals.size;

    // Stage 5: Active User (users with XP > 0 or recent activity)
    console.log('[Funnel Metrics] Querying balances collection...');
    const balancesSnapshot = await getDocs(collection(db, 'balances'));
    console.log(`[Funnel Metrics] Retrieved ${balancesSnapshot.size} balances`);
    
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
    
    const duration = Date.now() - startTime;
    console.log(`[Funnel Metrics] ✅ Successfully fetched real data in ${duration}ms`, {
      signedUp,
      profileComplete,
      firstSession,
      madeReferral,
      activeUsers,
    });

    return {
      stages,
      totalEntered: signedUp,
      totalConverted: activeUsers,
      overallConversionRate: signedUp > 0 ? Math.round((activeUsers / signedUp) * 100) : 0,
      avgTimeToConvert,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Log error but don't throw - fall back to demo data
    console.warn('[Funnel Metrics] ⚠️ Error fetching real data, falling back to demo data:', {
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
    });
    
    // Return demo data
    console.log('[Funnel Metrics] 📊 Returning demo data');
    return getDemoFunnelMetrics();
  }
}

/**
 * Get demo funnel metrics
 */
function getDemoFunnelMetrics(): FunnelMetrics {
  return {
    stages: [
      {
        stage: 'Signed Up',
        count: 1000,
        conversionRate: 100,
        dropoffRate: 0,
      },
      {
        stage: 'Completed Profile',
        count: 750,
        conversionRate: 75,
        dropoffRate: 25,
      },
      {
        stage: 'First Session',
        count: 500,
        conversionRate: 50,
        dropoffRate: 33,
      },
      {
        stage: 'Made Referral',
        count: 200,
        conversionRate: 20,
        dropoffRate: 60,
      },
      {
        stage: 'Active User',
        count: 150,
        conversionRate: 15,
        dropoffRate: 25,
      },
    ],
    totalEntered: 1000,
    totalConverted: 150,
    overallConversionRate: 15,
    avgTimeToConvert: 2.5,
  };
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

