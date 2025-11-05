import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import * as crypto from 'crypto';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const getDb = () => admin.firestore();

/**
 * Get experiment for a loop
 * Returns the active experiment for a given loop type, or null if none
 */
export async function getActiveExperiment(loopType: string): Promise<any | null> {
  try {
    const db = getDb();
    const snapshot = await db
      .collection('experiments')
      .where('loopType', '==', loopType)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return snapshot.docs[0].data();
  } catch (error: any) {
    logger.error('❌ Error getting active experiment', {
      error: error.message,
      loopType,
    });
    return null;
  }
}

/**
 * Get variant for user in experiment
 * Uses consistent hashing to ensure same user always gets same variant
 * 
 * @returns { experimentId, variantId } or null if no experiment active
 */
export async function getUserVariant(
  userId: string,
  loopType: string
): Promise<{ experimentId: string; variantId: string } | null> {
  try {
    // Get active experiment for this loop
    const experiment = await getActiveExperiment(loopType);
    
    if (!experiment) {
      // No experiment running, return default
      return { experimentId: 'default', variantId: 'control' };
    }
    
    // Use consistent hashing to assign variant
    const variantId = hashToVariant(userId, experiment.experimentId, experiment.variants);
    
    logger.info('✅ User allocated to variant', {
      userId: userId.substring(0, 8),
      experimentId: experiment.experimentId,
      variantId,
    });
    
    return {
      experimentId: experiment.experimentId,
      variantId,
    };
  } catch (error: any) {
    logger.error('❌ Error getting user variant', {
      error: error.message,
      userId: userId.substring(0, 8),
      loopType,
    });
    
    // Fallback to control
    return { experimentId: 'default', variantId: 'control' };
  }
}

/**
 * Hash userId + experimentId to determine variant
 * Uses MD5 hash converted to 0-99 range, then maps to variant allocation
 */
function hashToVariant(
  userId: string,
  experimentId: string,
  variants: any[]
): string {
  // Create hash of userId + experimentId
  const hash = crypto.createHash('md5')
    .update(userId + experimentId)
    .digest('hex');
  
  // Convert first 8 hex chars to number 0-99
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const bucket = hashInt % 100; // 0-99
  
  // Map bucket to variant based on allocation %
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.allocationPct;
    if (bucket < cumulative) {
      return variant.variantId;
    }
  }
  
  // Fallback to first variant
  return variants[0].variantId;
}

/**
 * Log growth event
 * Used for K-factor computation
 */
export async function logGrowthEvent(
  eventType: string,
  userId: string,
  loopType: string,
  experimentId?: string,
  variantId?: string,
  metadata?: any
): Promise<void> {
  try {
    const db = getDb();
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    await db.collection('experiment_events').doc(eventId).set({
      eventId,
      eventType,
      userId,
      loopType,
      experimentId: experimentId || 'default',
      variantId: variantId || 'control',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: metadata || {},
    });
    
    logger.info('✅ Growth event logged', {
      eventType,
      userId: userId.substring(0, 8),
      experimentId,
      variantId,
    });
  } catch (error: any) {
    // Don't fail the request if event logging fails
    logger.error('❌ Failed to log growth event', {
      error: error.message,
      eventType,
      userId: userId.substring(0, 8),
    });
  }
}

/**
 * List all experiments (admin only)
 */
export const listExperiments = onCall(
  {
    timeoutSeconds: 10,
    memory: '256MiB',
  },
  async (request) => {
    const { auth } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    if (!auth.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }
    
    try {
      const db = getDb();
      const snapshot = await db
        .collection('experiments')
        .orderBy('startDate', 'desc')
        .get();
      
      const experiments = snapshot.docs.map((doc) => doc.data());
      
      return {
        success: true,
        experiments,
        count: experiments.length,
      };
    } catch (error: any) {
      logger.error('❌ Error listing experiments', {
        error: error.message,
      });
      throw new HttpsError('internal', `Failed to list experiments: ${error.message}`);
    }
  }
);

/**
 * Create experiment (admin only)
 */
export const createExperiment = onCall(
  {
    timeoutSeconds: 10,
    memory: '256MiB',
  },
  async (request) => {
    const { auth, data } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    if (!auth.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }
    
    const { name, description, loopType, variants, guardrails } = data;
    
    // Validate inputs
    if (!name || !loopType || !variants || variants.length < 2) {
      throw new HttpsError('invalid-argument', 'Missing required fields or insufficient variants');
    }
    
    // Validate allocation percentages sum to 100
    const totalAllocation = variants.reduce((sum: number, v: any) => sum + v.allocationPct, 0);
    if (totalAllocation !== 100) {
      throw new HttpsError('invalid-argument', `Allocation percentages must sum to 100, got ${totalAllocation}`);
    }
    
    try {
      const db = getDb();
      const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const experiment = {
        experimentId,
        name,
        description: description || '',
        loopType,
        status: 'draft',
        variants,
        guardrails: guardrails || {
          maxSpamRate: 0.005,
          maxOptOutRate: 0.01,
          maxCostMultiplier: 1.2,
        },
        startDate: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: auth.uid,
      };
      
      await db.collection('experiments').doc(experimentId).set(experiment);
      
      logger.info('✅ Experiment created', {
        experimentId,
        name,
        loopType,
      });
      
      return {
        success: true,
        experimentId,
      };
    } catch (error: any) {
      logger.error('❌ Error creating experiment', {
        error: error.message,
      });
      throw new HttpsError('internal', `Failed to create experiment: ${error.message}`);
    }
  }
);

/**
 * Update experiment status (admin only)
 */
export const updateExperiment = onCall(
  {
    timeoutSeconds: 10,
    memory: '256MiB',
  },
  async (request) => {
    const { auth, data } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    if (!auth.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }
    
    const { experimentId, status, pausedReason } = data;
    
    if (!experimentId) {
      throw new HttpsError('invalid-argument', 'experimentId is required');
    }
    
    try {
      const db = getDb();
      const updates: any = {};
      
      if (status) {
        updates.status = status;
      }
      
      if (pausedReason) {
        updates.pausedReason = pausedReason;
      }
      
      await db.collection('experiments').doc(experimentId).update(updates);
      
      logger.info('✅ Experiment updated', {
        experimentId,
        status,
      });
      
      return { success: true };
    } catch (error: any) {
      logger.error('❌ Error updating experiment', {
        error: error.message,
        experimentId,
      });
      throw new HttpsError('internal', `Failed to update experiment: ${error.message}`);
    }
  }
);

