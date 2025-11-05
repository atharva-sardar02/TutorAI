import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getKFactorData } from './computeMetrics';

const getDb = () => admin.firestore();

/**
 * Get K-factor metrics by loop/variant/date range
 * Admin only
 */
export const getKFactorMetrics = onCall(
  {
    timeoutSeconds: 30,
    memory: '512MiB',
  },
  async (request) => {
    const { auth, data } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    if (!auth.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }
    
    const {
      experimentId,
      variantId,
      loopType,
      startDate,
      endDate,
    } = data;
    
    try {
      logger.info('📊 Fetching K-factor metrics', {
        experimentId,
        variantId,
        loopType,
      });
      
      const db = getDb();
      
      // If specific experiment requested
      if (experimentId && variantId) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        
        const metrics = await getKFactorData(experimentId, variantId, start, end);
        
        return {
          success: true,
          data: metrics,
          count: metrics.length,
        };
      }
      
      // Otherwise, return latest metrics for all active experiments
      const experimentsSnapshot = await db
        .collection('experiments')
        .where('status', '==', 'active')
        .get();
      
      const allMetrics = [];
      
      for (const expDoc of experimentsSnapshot.docs) {
        const experiment = expDoc.data();
        
        for (const variant of experiment.variants) {
          // Get last 7 days
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const now = new Date();
          
          const variantMetrics = await getKFactorData(
            experiment.experimentId,
            variant.variantId,
            weekAgo,
            now
          );
          
          allMetrics.push({
            experimentId: experiment.experimentId,
            experimentName: experiment.name,
            variantId: variant.variantId,
            variantName: variant.name,
            loopType: experiment.loopType,
            metrics: variantMetrics,
          });
        }
      }
      
      return {
        success: true,
        data: allMetrics,
        count: allMetrics.length,
      };
      
    } catch (error: any) {
      logger.error('❌ Error fetching K-factor metrics', {
        error: error.message,
      });
      throw new HttpsError('internal', `Failed to fetch metrics: ${error.message}`);
    }
  }
);

/**
 * Get funnel metrics (invite → open → join → FVM)
 * Admin only
 */
export const getFunnelMetrics = onCall(
  {
    timeoutSeconds: 30,
    memory: '512MiB',
  },
  async (request) => {
    const { auth, data } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    if (!auth.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }
    
    const {
      experimentId,
      variantId,
      loopType,
      startDate,
      endDate,
    } = data;
    
    try {
      logger.info('📊 Fetching funnel metrics', {
        experimentId,
        variantId,
        loopType,
      });
      
      const db = getDb();
      const start = startDate ? admin.firestore.Timestamp.fromDate(new Date(startDate)) : 
                    admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const end = endDate ? admin.firestore.Timestamp.fromDate(new Date(endDate)) : 
                  admin.firestore.Timestamp.fromDate(new Date());
      
      // Build query
      let query: admin.firestore.Query = db
        .collection('experiment_events')
        .where('timestamp', '>=', start)
        .where('timestamp', '<=', end);
      
      if (experimentId) {
        query = query.where('experimentId', '==', experimentId);
      }
      if (variantId) {
        query = query.where('variantId', '==', variantId);
      }
      if (loopType) {
        query = query.where('loopType', '==', loopType);
      }
      
      const snapshot = await query.get();
      
      // Count events by type
      const eventCounts: { [key: string]: Set<string> } = {
        loop_exposed: new Set(),
        invite_sent: new Set(),
        invite_opened: new Set(),
        join_completed: new Set(),
        fvm_reached: new Set(),
      };
      
      snapshot.docs.forEach((doc) => {
        const event = doc.data();
        if (eventCounts[event.eventType]) {
          eventCounts[event.eventType].add(event.userId);
        }
      });
      
      // Build funnel
      const totalExposed = eventCounts.loop_exposed.size;
      const funnel = [
        {
          stage: 'exposed',
          count: totalExposed,
          pct: 100,
        },
        {
          stage: 'invite_sent',
          count: eventCounts.invite_sent.size,
          pct: totalExposed > 0 ? (eventCounts.invite_sent.size / totalExposed) * 100 : 0,
        },
        {
          stage: 'invite_opened',
          count: eventCounts.invite_opened.size,
          pct: totalExposed > 0 ? (eventCounts.invite_opened.size / totalExposed) * 100 : 0,
        },
        {
          stage: 'join_completed',
          count: eventCounts.join_completed.size,
          pct: totalExposed > 0 ? (eventCounts.join_completed.size / totalExposed) * 100 : 0,
        },
        {
          stage: 'fvm_reached',
          count: eventCounts.fvm_reached.size,
          pct: totalExposed > 0 ? (eventCounts.fvm_reached.size / totalExposed) * 100 : 0,
        },
      ];
      
      return {
        success: true,
        funnel,
        filters: {
          experimentId: experimentId || 'all',
          variantId: variantId || 'all',
          loopType: loopType || 'all',
          dateRange: { startDate, endDate },
        },
      };
      
    } catch (error: any) {
      logger.error('❌ Error fetching funnel metrics', {
        error: error.message,
      });
      throw new HttpsError('internal', `Failed to fetch funnel: ${error.message}`);
    }
  }
);

/**
 * Get retention metrics (D1, D7, D28)
 * Admin only
 */
export const getRetentionMetrics = onCall(
  {
    timeoutSeconds: 60,
    memory: '1GiB',
  },
  async (request) => {
    const { auth, data } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    if (!auth.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }
    
    const {
      cohortDate, // ISO string: "2025-11-01"
      retentionDays, // Array: [1, 7, 28]
    } = data;
    
    if (!cohortDate) {
      throw new HttpsError('invalid-argument', 'cohortDate is required');
    }
    
    try {
      logger.info('📊 Fetching retention metrics', {
        cohortDate,
        retentionDays,
      });
      
      const db = getDb();
      const cohortDateObj = new Date(cohortDate);
      const nextDay = new Date(cohortDateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Get users who joined on cohortDate
      const usersSnapshot = await db
        .collection('users')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(cohortDateObj))
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(nextDay))
        .get();
      
      const cohortSize = usersSnapshot.size;
      const cohortUserIds = usersSnapshot.docs.map((doc) => doc.id);
      
      if (cohortSize === 0) {
        return {
          success: true,
          cohortDate,
          cohortSize: 0,
          retention: [],
        };
      }
      
      // Calculate retention for each day
      const days = retentionDays || [1, 7, 28];
      const retention = [];
      
      for (const day of days) {
        const targetDate = new Date(cohortDateObj);
        targetDate.setDate(targetDate.getDate() + day);
        const nextTargetDay = new Date(targetDate);
        nextTargetDay.setDate(nextTargetDay.getDate() + 1);
        
        // Count users with activity on target day
        // (For MVP, we'll check messages sent - expand later)
        let activeCount = 0;
        
        // Batch check users in chunks of 10 (Firestore 'in' limit)
        for (let i = 0; i < cohortUserIds.length; i += 10) {
          const batch = cohortUserIds.slice(i, i + 10);
          
          const messagesSnapshot = await db
            .collection('messages')
            .where('senderId', 'in', batch)
            .where('serverTimestamp', '>=', admin.firestore.Timestamp.fromDate(targetDate))
            .where('serverTimestamp', '<', admin.firestore.Timestamp.fromDate(nextTargetDay))
            .limit(batch.length)
            .get();
          
          const activeUsers = new Set(messagesSnapshot.docs.map((doc) => doc.data().senderId));
          activeCount += activeUsers.size;
        }
        
        retention.push({
          day,
          activeUsers: activeCount,
          pct: (activeCount / cohortSize) * 100,
        });
      }
      
      return {
        success: true,
        cohortDate,
        cohortSize,
        retention,
      };
      
    } catch (error: any) {
      logger.error('❌ Error fetching retention metrics', {
        error: error.message,
      });
      throw new HttpsError('internal', `Failed to fetch retention: ${error.message}`);
    }
  }
);

/**
 * Get fraud review queue
 * Admin only
 */
export const getFraudQueue = onCall(
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
    
    const {
      status, // 'pending' | 'approved' | 'rejected'
      minScore, // Minimum anomaly score
      limit,
    } = data;
    
    try {
      logger.info('📊 Fetching fraud queue', {
        status,
        minScore,
      });
      
      const db = getDb();
      let query: admin.firestore.Query = db.collection('fraud_queue');
      
      if (status) {
        query = query.where('status', '==', status);
      }
      
      if (minScore !== undefined) {
        query = query.where('anomalyScore', '>=', minScore);
      }
      
      query = query.orderBy('anomalyScore', 'desc').limit(limit || 50);
      
      const snapshot = await query.get();
      const items = snapshot.docs.map((doc) => doc.data());
      
      return {
        success: true,
        items,
        count: items.length,
      };
      
    } catch (error: any) {
      logger.error('❌ Error fetching fraud queue', {
        error: error.message,
      });
      throw new HttpsError('internal', `Failed to fetch fraud queue: ${error.message}`);
    }
  }
);

/**
 * Approve fraud item
 * Admin only
 */
export const approveFraudItem = onCall(
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
    
    const { referralId } = data;
    
    if (!referralId) {
      throw new HttpsError('invalid-argument', 'referralId is required');
    }
    
    try {
      const db = getDb();
      
      await db.collection('fraud_queue').doc(referralId).update({
        status: 'approved',
        reviewedBy: auth.uid,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Log admin action
      await logAdminAction(auth.uid, 'approve_fraud', referralId);
      
      logger.info('✅ Fraud item approved', {
        referralId,
        admin: auth.uid.substring(0, 8),
      });
      
      return { success: true };
      
    } catch (error: any) {
      logger.error('❌ Error approving fraud item', {
        error: error.message,
      });
      throw new HttpsError('internal', `Failed to approve: ${error.message}`);
    }
  }
);

/**
 * Reject fraud item
 * Admin only
 */
export const rejectFraudItem = onCall(
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
    
    const { referralId, reason } = data;
    
    if (!referralId) {
      throw new HttpsError('invalid-argument', 'referralId is required');
    }
    
    try {
      const db = getDb();
      
      await db.collection('fraud_queue').doc(referralId).update({
        status: 'rejected',
        reviewedBy: auth.uid,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectionReason: reason || 'No reason provided',
      });
      
      // Log admin action
      await logAdminAction(auth.uid, 'reject_fraud', referralId, { reason });
      
      logger.info('✅ Fraud item rejected', {
        referralId,
        admin: auth.uid.substring(0, 8),
      });
      
      return { success: true };
      
    } catch (error: any) {
      logger.error('❌ Error rejecting fraud item', {
        error: error.message,
      });
      throw new HttpsError('internal', `Failed to reject: ${error.message}`);
    }
  }
);

/**
 * Log admin action to audit trail
 */
async function logAdminAction(
  adminId: string,
  action: string,
  target: string,
  metadata?: any
): Promise<void> {
  try {
    const db = getDb();
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Get admin email
    const adminUser = await admin.auth().getUser(adminId);
    
    await db.collection('admin_audit_log').doc(logId).set({
      logId,
      adminId,
      adminEmail: adminUser.email || 'unknown',
      action,
      target,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: metadata || {},
    });
    
  } catch (error: any) {
    // Don't fail the main operation if logging fails
    logger.error('❌ Failed to log admin action', {
      error: error.message,
      action,
    });
  }
}

