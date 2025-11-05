/**
 * DSR Handler - PR31
 * 
 * Data Subject Rights (DSR) endpoints for GDPR/CCPA compliance
 * - Export user data (right to access)
 * - Delete user account (right to be forgotten)
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { exportUserData } from './exportUserData';
import { deleteUserData } from './deleteUserData';

const getDb = () => admin.firestore();

/**
 * Export all user data (GDPR/CCPA right to access)
 * 
 * Callable function: exportUserDataEndpoint
 * Returns: JSON object with all user data
 */
export const exportUserDataEndpoint = onCall({
  region: 'us-central1',
  memory: '512MiB',
  timeoutSeconds: 300, // 5 minutes max
}, async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = data?.userId || auth.uid;
  
  // Users can only export their own data (or admins can export any)
  if (userId !== auth.uid && !auth.token.admin) {
    throw new HttpsError('permission-denied', 'Can only export your own data');
  }
  
  logger.info('📦 Export user data requested', {
    userId: userId.substring(0, 8),
    requestedBy: auth.uid.substring(0, 8),
  });
  
  try {
    const userData = await exportUserData(userId);
    
    // Log export for audit trail
    await getDb().collection('dsr_requests').add({
      type: 'export',
      userId,
      requestedBy: auth.uid,
      requestedAt: admin.firestore.Timestamp.now(),
      status: 'completed',
    });
    
    logger.info('✅ User data exported', {
      userId: userId.substring(0, 8),
      dataSize: JSON.stringify(userData).length,
    });
    
    return {
      success: true,
      data: userData,
      exportedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error('❌ Failed to export user data', {
      userId: userId.substring(0, 8),
      error: error.message,
    });
    throw new HttpsError('internal', 'Failed to export user data');
  }
});

/**
 * Delete user account and all data (GDPR/CCPA right to be forgotten)
 * 
 * Callable function: deleteUserAccountEndpoint
 * Soft delete: Marks as deleted, purges after 30 days
 */
export const deleteUserAccountEndpoint = onCall({
  region: 'us-central1',
  memory: '256MiB',
}, async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = data?.userId || auth.uid;
  const reason = data?.reason || 'User requested deletion';
  
  // Users can only delete their own account (or admins can delete any)
  if (userId !== auth.uid && !auth.token.admin) {
    throw new HttpsError('permission-denied', 'Can only delete your own account');
  }
  
  logger.warn('🗑️ Delete user account requested', {
    userId: userId.substring(0, 8),
    requestedBy: auth.uid.substring(0, 8),
    reason,
  });
  
  try {
    await deleteUserData(userId, reason);
    
    // Log deletion for audit trail
    await getDb().collection('dsr_requests').add({
      type: 'delete',
      userId,
      requestedBy: auth.uid,
      requestedAt: admin.firestore.Timestamp.now(),
      status: 'completed',
      reason,
    });
    
    logger.info('✅ User account deletion initiated', {
      userId: userId.substring(0, 8),
      purgeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    
    return {
      success: true,
      message: 'Account marked for deletion. Data will be purged in 30 days.',
      purgeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error: any) {
    logger.error('❌ Failed to delete user account', {
      userId: userId.substring(0, 8),
      error: error.message,
    });
    throw new HttpsError('internal', 'Failed to delete account');
  }
});

