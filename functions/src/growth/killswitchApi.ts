import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const getDb = () => admin.firestore();

/**
 * List all kill-switches (feature flags)
 * Admin only
 */
export const listKillSwitches = onCall(
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
      const snapshot = await db.collection('feature_flags').get();
      
      const flags = snapshot.docs.map((doc) => ({
        name: doc.id,
        ...doc.data(),
      }));
      
      return {
        success: true,
        flags,
        count: flags.length,
      };
      
    } catch (error: any) {
      logger.error('❌ Error listing kill-switches', {
        error: error.message,
      });
      throw new HttpsError('internal', `Failed to list kill-switches: ${error.message}`);
    }
  }
);

/**
 * Toggle kill-switch (enable/disable feature)
 * Admin only
 */
export const toggleKillSwitch = onCall(
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
    
    const { target, enabled } = data;
    
    if (!target || enabled === undefined) {
      throw new HttpsError('invalid-argument', 'target and enabled are required');
    }
    
    try {
      const db = getDb();
      
      // Update feature flag
      await db.collection('feature_flags').doc(target).set({
        enabled,
        updatedBy: auth.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      // Log admin action
      await logAdminAction(auth.uid, enabled ? 'enable_feature' : 'disable_feature', target);
      
      logger.info(`✅ Kill-switch toggled: ${target} → ${enabled}`, {
        admin: auth.uid.substring(0, 8),
      });
      
      // Optional: Verify fallback behavior
      if (!enabled) {
        await verifyFallback(target);
      }
      
      return { success: true };
      
    } catch (error: any) {
      logger.error('❌ Error toggling kill-switch', {
        error: error.message,
        target,
      });
      throw new HttpsError('internal', `Failed to toggle kill-switch: ${error.message}`);
    }
  }
);

/**
 * Verify fallback behavior when feature is disabled
 * For MVP, just log. In production, run actual health checks
 */
async function verifyFallback(target: string): Promise<void> {
  logger.info(`🧪 Verifying fallback for ${target}...`);
  
  // TODO: Implement actual fallback verification
  // For example:
  // - Disable orchestrator → verify it returns safe response
  // - Disable incentives → verify rewards still work with defaults
  
  logger.info(`✅ Fallback verified for ${target} (mock)`);
}

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

