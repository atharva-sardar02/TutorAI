import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const getDb = () => admin.firestore();

/**
 * Compute K-factor daily
 * Runs every day at 2am UTC
 * 
 * K-Factor = (invites per user) × (joins per invite)
 */
export const computeKFactor = onSchedule(
  {
    schedule: 'every day 02:00',
    timeZone: 'UTC',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes
  },
  async () => {
    const startTime = Date.now();
    logger.info('🚀 Starting K-factor computation...');
    
    try {
      const db = getDb();
      
      // Get all active experiments
      const experimentsSnapshot = await db
        .collection('experiments')
        .where('status', '==', 'active')
        .get();
      
      if (experimentsSnapshot.empty) {
        logger.info('✅ No active experiments, skipping K-factor computation');
        return;
      }
      
      const experiments = experimentsSnapshot.docs.map((doc) => doc.data());
      logger.info(`📊 Computing K-factor for ${experiments.length} experiments`);
      
      // For each experiment
      for (const experiment of experiments) {
        logger.info(`Processing experiment: ${experiment.experimentId}`);
        
        // For each variant
        for (const variant of experiment.variants) {
          try {
            const kFactor = await computeVariantKFactor(
              experiment.experimentId,
              variant.variantId,
              experiment.loopType
            );
            
            logger.info(`✅ K-factor computed for ${experiment.experimentId} / ${variant.variantId}: ${kFactor.kFactor}`);
          } catch (error: any) {
            logger.error(`❌ Error computing K-factor for ${experiment.experimentId} / ${variant.variantId}`, {
              error: error.message,
            });
          }
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info(`✅ K-factor computation complete in ${duration}ms`);
      
    } catch (error: any) {
      logger.error('❌ K-factor computation failed', {
        error: error.message,
      });
    }
  }
);

/**
 * Compute K-factor for a specific variant
 */
async function computeVariantKFactor(
  experimentId: string,
  variantId: string,
  loopType: string
): Promise<any> {
  const db = getDb();
  
  // Get yesterday's date (since we're computing daily at 2am)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const dayAfterYesterday = new Date(yesterday);
  dayAfterYesterday.setDate(dayAfterYesterday.getDate() + 1);
  
  // 1. Count unique users exposed to this variant yesterday
  const exposedSnapshot = await db
    .collection('experiment_events')
    .where('experimentId', '==', experimentId)
    .where('variantId', '==', variantId)
    .where('eventType', '==', 'loop_exposed')
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(yesterday))
    .where('timestamp', '<', admin.firestore.Timestamp.fromDate(dayAfterYesterday))
    .get();
  
  const uniqueUsers = new Set(exposedSnapshot.docs.map((doc) => doc.data().userId));
  const userCount = uniqueUsers.size;
  
  if (userCount === 0) {
    logger.warn(`⚠️ No users exposed for ${experimentId} / ${variantId}`);
    return {
      kFactor: 0,
      stats: { users: 0, invites: 0, joins: 0, invitesPerUser: 0, joinsPerInvite: 0 },
    };
  }
  
  // 2. Count invites sent by these users
  const invitesSnapshot = await db
    .collection('experiment_events')
    .where('experimentId', '==', experimentId)
    .where('variantId', '==', variantId)
    .where('eventType', '==', 'invite_sent')
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(yesterday))
    .where('timestamp', '<', admin.firestore.Timestamp.fromDate(dayAfterYesterday))
    .get();
  
  const inviteCount = invitesSnapshot.size;
  
  // 3. Count joins from those invites
  const joinsSnapshot = await db
    .collection('experiment_events')
    .where('experimentId', '==', experimentId)
    .where('variantId', '==', variantId)
    .where('eventType', '==', 'join_completed')
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(yesterday))
    .where('timestamp', '<', admin.firestore.Timestamp.fromDate(dayAfterYesterday))
    .get();
  
  const joinCount = joinsSnapshot.size;
  
  // 4. Compute K-factor
  const invitesPerUser = inviteCount / userCount;
  const joinsPerInvite = inviteCount > 0 ? joinCount / inviteCount : 0;
  const kFactor = invitesPerUser * joinsPerInvite;
  
  // 5. Save metrics
  const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
  const metrics = {
    date: admin.firestore.Timestamp.fromDate(yesterday),
    experimentId,
    variantId,
    kFactor,
    stats: {
      users: userCount,
      invites: inviteCount,
      joins: joinCount,
      invitesPerUser,
      joinsPerInvite,
    },
  };
  
  await db
    .collection('experiment_metrics')
    .doc(experimentId)
    .collection('variants')
    .doc(variantId)
    .collection('daily')
    .doc(dateStr)
    .set(metrics);
  
  return metrics;
}

/**
 * Get K-factor for date range (helper for admin API)
 */
export async function getKFactorData(
  experimentId: string,
  variantId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const db = getDb();
  
  const snapshot = await db
    .collection('experiment_metrics')
    .doc(experimentId)
    .collection('variants')
    .doc(variantId)
    .collection('daily')
    .where('date', '>=', admin.firestore.Timestamp.fromDate(startDate))
    .where('date', '<=', admin.firestore.Timestamp.fromDate(endDate))
    .orderBy('date', 'asc')
    .get();
  
  return snapshot.docs.map((doc) => doc.data());
}

