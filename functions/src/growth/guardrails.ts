import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const getDb = () => admin.firestore();

/**
 * Check guardrails for all active experiments
 * Runs every hour
 */
export const checkGuardrails = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    memory: '512MiB',
    timeoutSeconds: 300, // 5 minutes
  },
  async () => {
    const startTime = Date.now();
    logger.info('🛡️ Starting guardrail checks...');
    
    try {
      const db = getDb();
      
      // Get all active experiments
      const experimentsSnapshot = await db
        .collection('experiments')
        .where('status', '==', 'active')
        .get();
      
      if (experimentsSnapshot.empty) {
        logger.info('✅ No active experiments to check');
        return;
      }
      
      const experiments = experimentsSnapshot.docs.map((doc) => doc.data());
      logger.info(`🛡️ Checking guardrails for ${experiments.length} experiments`);
      
      for (const experiment of experiments) {
        try {
          await checkExperimentGuardrails(experiment);
        } catch (error: any) {
          logger.error(`❌ Error checking guardrails for ${experiment.experimentId}`, {
            error: error.message,
          });
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info(`✅ Guardrail checks complete in ${duration}ms`);
      
    } catch (error: any) {
      logger.error('❌ Guardrail checks failed', {
        error: error.message,
      });
    }
  }
);

/**
 * Check guardrails for a single experiment
 */
async function checkExperimentGuardrails(experiment: any): Promise<void> {
  const { experimentId, guardrails } = experiment;
  
  // Check spam rate
  const spamRate = await calculateSpamRate(experimentId);
  if (spamRate > guardrails.maxSpamRate) {
    logger.warn(`⚠️ Spam rate exceeded for ${experimentId}: ${spamRate} > ${guardrails.maxSpamRate}`);
    await pauseExperiment(experimentId, `High spam rate: ${spamRate.toFixed(4)}`);
    await alertAdmins(experiment, 'spam', spamRate);
    return;
  }
  
  // Check opt-out rate
  const optOutRate = await calculateOptOutRate(experimentId);
  if (optOutRate > guardrails.maxOptOutRate) {
    logger.warn(`⚠️ Opt-out rate exceeded for ${experimentId}: ${optOutRate} > ${guardrails.maxOptOutRate}`);
    await pauseExperiment(experimentId, `High opt-out rate: ${optOutRate.toFixed(4)}`);
    await alertAdmins(experiment, 'opt-out', optOutRate);
    return;
  }
  
  // Check cost multiplier
  const costMultiplier = await calculateCostMultiplier(experimentId);
  if (costMultiplier > guardrails.maxCostMultiplier) {
    logger.warn(`⚠️ Cost multiplier exceeded for ${experimentId}: ${costMultiplier} > ${guardrails.maxCostMultiplier}`);
    await pauseExperiment(experimentId, `Cost anomaly: ${costMultiplier.toFixed(2)}x`);
    await alertAdmins(experiment, 'cost', costMultiplier);
    return;
  }
  
  logger.info(`✅ Guardrails passed for ${experimentId}`);
}

/**
 * Calculate spam rate for experiment
 * Spam = users flagged by fraud detection / total users
 */
async function calculateSpamRate(experimentId: string): Promise<number> {
  try {
    const db = getDb();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get all users exposed in last 24h
    const exposedSnapshot = await db
      .collection('experiment_events')
      .where('experimentId', '==', experimentId)
      .where('eventType', '==', 'loop_exposed')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
      .get();
    
    const uniqueUsers = new Set(exposedSnapshot.docs.map((doc) => doc.data().userId));
    const totalUsers = uniqueUsers.size;
    
    if (totalUsers === 0) {
      return 0;
    }
    
    // Count how many of these users are in fraud queue
    const fraudSnapshot = await db
      .collection('fraud_queue')
      .where('status', '==', 'pending')
      .get();
    
    const flaggedUsers = fraudSnapshot.docs
      .map((doc) => doc.data().userId)
      .filter((userId) => uniqueUsers.has(userId));
    
    const spamRate = flaggedUsers.length / totalUsers;
    return spamRate;
  } catch (error: any) {
    logger.error('❌ Error calculating spam rate', {
      error: error.message,
      experimentId,
    });
    return 0; // Optimistic: assume no spam if calculation fails
  }
}

/**
 * Calculate opt-out rate for experiment
 * Opt-out = users who disabled growth prompts / total users
 */
async function calculateOptOutRate(experimentId: string): Promise<number> {
  try {
    const db = getDb();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get all users exposed in last 24h
    const exposedSnapshot = await db
      .collection('experiment_events')
      .where('experimentId', '==', experimentId)
      .where('eventType', '==', 'loop_exposed')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
      .get();
    
    const uniqueUsers = new Set(exposedSnapshot.docs.map((doc) => doc.data().userId));
    const totalUsers = uniqueUsers.size;
    
    if (totalUsers === 0) {
      return 0;
    }
    
    // Count how many opted out
    // (For MVP, we'll assume opt-out is stored in user preferences)
    const userDocs = await Promise.all(
      Array.from(uniqueUsers).map((userId) =>
        db.collection('users').doc(userId).get()
      )
    );
    
    const optedOutCount = userDocs.filter((doc) => {
      const data = doc.data();
      return data?.preferences?.growthPromptsDisabled === true;
    }).length;
    
    const optOutRate = optedOutCount / totalUsers;
    return optOutRate;
  } catch (error: any) {
    logger.error('❌ Error calculating opt-out rate', {
      error: error.message,
      experimentId,
    });
    return 0; // Optimistic
  }
}

/**
 * Calculate cost multiplier for experiment
 * Cost = (total cost last 24h) / (baseline cost)
 */
async function calculateCostMultiplier(experimentId: string): Promise<number> {
  try {
    // For MVP, we'll return 1.0 (no cost anomaly)
    // In production, this would:
    // 1. Query Cloud Functions cost metrics from Google Cloud Monitoring
    // 2. Query OpenAI API costs from usage logs
    // 3. Compare to baseline from previous weeks
    
    // TODO: Implement actual cost monitoring
    return 1.0;
  } catch (error: any) {
    logger.error('❌ Error calculating cost multiplier', {
      error: error.message,
      experimentId,
    });
    return 1.0; // Optimistic
  }
}

/**
 * Pause experiment due to guardrail breach
 */
async function pauseExperiment(experimentId: string, reason: string): Promise<void> {
  try {
    const db = getDb();
    
    await db.collection('experiments').doc(experimentId).update({
      status: 'paused',
      pausedReason: reason,
      pausedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.warn(`⏸️ Experiment ${experimentId} paused: ${reason}`);
  } catch (error: any) {
    logger.error('❌ Failed to pause experiment', {
      error: error.message,
      experimentId,
    });
  }
}

/**
 * Alert admins about guardrail breach
 * For MVP, just log. In production, send email/Slack notification
 */
async function alertAdmins(
  experiment: any,
  type: 'spam' | 'opt-out' | 'cost',
  value: number
): Promise<void> {
  logger.warn(`🚨 GUARDRAIL ALERT: ${experiment.experimentId}`, {
    type,
    value,
    experimentName: experiment.name,
    loopType: experiment.loopType,
  });
  
  // TODO: Send email or Slack notification
  // For now, just log to Cloud Functions logs
}

