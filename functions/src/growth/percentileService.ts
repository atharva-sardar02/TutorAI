import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const getDb = () => admin.firestore();

interface UserPercentileData {
  userId: string;
  role: 'tutor' | 'parent';
  monthlyXp: number;
  monthlyChallenges: number;
}

/**
 * Compute monthly XP percentile for each user based on their role cohort.
 * 
 * Runs daily at 3 AM UTC to refresh monthly rankings.
 * Results are stored in users/{uid}.stats with:
 * - monthlyXp: Total XP earned this month
 * - monthlyChallenges: Number of challenges completed this month
 * - monthlyPercentile: User's percentile rank (0-100)
 * - monthStart: Start of current month for cache invalidation
 */
export const computeMonthlyPercentiles = onSchedule('0 3 * * *', async () => {
  logger.info('🎯 Computing monthly percentiles');
  
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartTimestamp = admin.firestore.Timestamp.fromDate(monthStart);

    // Step 1: Fetch all users with roles
    const usersSnapshot = await getDb().collection('users').get();
    const users = usersSnapshot.docs
      .map(doc => {
        const data = doc.data();
        const role = data.role || data.userType;
        if (role !== 'tutor' && role !== 'parent') {
          return null;
        }
        return {
          userId: doc.id,
          role: role as 'tutor' | 'parent',
          displayName: data.displayName || 'User',
        };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);

    logger.info(`📊 Processing ${users.length} users with valid roles`);

    // Step 2: Aggregate XP and challenges per user for the current month
    const userDataMap = new Map<string, UserPercentileData>();

    for (const user of users) {
      try {
        // Query rewards granted this month
        const rewardsSnapshot = await getDb()
          .collection('rewards')
          .doc(user.userId)
          .collection('grants')
          .where('grantedAt', '>=', monthStartTimestamp)
          .where('type', '==', 'xp')
          .get();

        const monthlyXp = rewardsSnapshot.docs.reduce((sum, doc) => {
          const amount = doc.data().amount || 0;
          return sum + amount;
        }, 0);

        // Count challenges completed this month (use metadata.loopType)
        const challengeRewards = rewardsSnapshot.docs.filter(doc => {
          const loopType = doc.data().loopType || doc.data().metadata?.loopType;
          return loopType?.includes('study_buddy') || loopType?.includes('challenge');
        });

        userDataMap.set(user.userId, {
          userId: user.userId,
          role: user.role,
          monthlyXp,
          monthlyChallenges: challengeRewards.length,
        });
      } catch (error: any) {
        logger.warn(`⚠️ Failed to fetch rewards for user ${user.userId.substring(0, 8)}`, {
          error: error.message,
        });
        // Set zero stats for this user
        userDataMap.set(user.userId, {
          userId: user.userId,
          role: user.role,
          monthlyXp: 0,
          monthlyChallenges: 0,
        });
      }
    }

    // Step 3: Separate by role and compute percentiles
    const tutors: UserPercentileData[] = [];
    const parents: UserPercentileData[] = [];

    userDataMap.forEach(userData => {
      if (userData.role === 'tutor') {
        tutors.push(userData);
      } else {
        parents.push(userData);
      }
    });

    logger.info(`📈 Role distribution: ${tutors.length} tutors, ${parents.length} parents`);

    // Step 4: Compute percentiles within each cohort
    const computePercentile = (userData: UserPercentileData, cohort: UserPercentileData[]): number => {
      // Guardrails: If cohort is too small (< 10), return null to hide percentile
      if (cohort.length < 10) {
        return -1; // Special value indicating insufficient data
      }

      // Count users with less XP than this user
      const usersBelow = cohort.filter(u => u.monthlyXp < userData.monthlyXp).length;
      
      // Percentile = (users below / total users) * 100
      const percentile = Math.round((usersBelow / cohort.length) * 100);
      
      return percentile;
    };

    const tutorPercentiles = tutors.map(t => ({
      ...t,
      percentile: computePercentile(t, tutors),
    }));

    const parentPercentiles = parents.map(p => ({
      ...p,
      percentile: computePercentile(p, parents),
    }));

    const allPercentiles = [...tutorPercentiles, ...parentPercentiles];

    // Step 5: Write results to user documents
    const batch = getDb().batch();
    let updateCount = 0;

    for (const userData of allPercentiles) {
      const userRef = getDb().collection('users').doc(userData.userId);
      
      batch.update(userRef, {
        'stats.monthlyXp': userData.monthlyXp,
        'stats.monthlyChallenges': userData.monthlyChallenges,
        'stats.monthlyPercentile': userData.percentile,
        'stats.monthStart': monthStartTimestamp,
        'stats.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
      });

      updateCount++;

      // Firestore batch limit is 500
      if (updateCount % 500 === 0) {
        await batch.commit();
        logger.info(`✅ Committed batch: ${updateCount} users updated`);
      }
    }

    // Commit remaining updates
    if (updateCount % 500 !== 0) {
      await batch.commit();
    }

    logger.info('✅ Monthly percentiles computed successfully', {
      totalUsers: allPercentiles.length,
      tutors: tutorPercentiles.length,
      parents: parentPercentiles.length,
      monthStart: monthStart.toISOString(),
    });

    // Emit analytics event for leaderboard removal (once)
    await getDb().collection('si_analytics').add({
      eventType: 'leaderboard_removed',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        replacedWith: 'percentile_system',
        reason: 'privacy_and_ux_improvements',
      },
    });

  } catch (error: any) {
    logger.error('❌ Failed to compute monthly percentiles', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

