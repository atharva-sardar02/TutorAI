/**
 * Delete User Data - PR31
 * 
 * Implements right to be forgotten for GDPR/CCPA compliance
 * Soft delete + anonymization strategy
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const getDb = () => admin.firestore();

/**
 * Delete user account and all associated data
 * 
 * Strategy:
 * 1. Soft delete: Mark user as deleted, set purge date 30 days out
 * 2. Remove from active collections: referrals, consents, rewards, balances
 * 3. Anonymize analytics: agent_logs, loop_exposures (replace userId with "deleted_user")
 * 4. Keep for compliance: DSR logs (retain 7 years)
 * 
 * @param userId - User to delete
 * @param reason - Reason for deletion
 */
export async function deleteUserData(userId: string, reason: string): Promise<void> {
  const db = getDb();
  const now = admin.firestore.Timestamp.now();
  const purgeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  logger.info('🗑️ Starting user data deletion', {
    userId: userId.substring(0, 8),
    reason,
    purgeDate: purgeDate.toISOString(),
  });
  
  try {
    // 1. Mark user as deleted (soft delete)
    await db.collection('users').doc(userId).update({
      deleted: true,
      deletedAt: now,
      purgeDate: admin.firestore.Timestamp.fromDate(purgeDate),
      deletionReason: reason,
      // Anonymize PII
      displayName: '[Deleted User]',
      email: `deleted_${userId.substring(0, 8)}@deleted.local`,
      photoURL: '',
      phoneNumber: '',
    });
    
    logger.info('✅ User marked as deleted', {
      userId: userId.substring(0, 8),
    });
    
    // 2. Delete from active collections
    const batch = db.batch();
    
    // Delete referrals
    const referralsSnapshot = await db
      .collection('referrals')
      .where('referrerId', '==', userId)
      .get();
    referralsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete consents
    const consentsDoc = db.collection('consents').doc(userId);
    batch.delete(consentsDoc);
    
    // Delete rewards
    const rewardsSnapshot = await db
      .collection('rewards')
      .where('userId', '==', userId)
      .get();
    rewardsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete balances
    const balancesDoc = db.collection('balances').doc(userId);
    batch.delete(balancesDoc);
    
    // Delete reels (already handled by onConsentRevoked, but double-check)
    const reelsSnapshot = await db
      .collection('reels')
      .where('userId', '==', userId)
      .get();
    reelsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete challenges (where creator)
    const challengesSnapshot = await db
      .collection('challenges')
      .where('creatorId', '==', userId)
      .get();
    challengesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    
    logger.info('✅ Deleted from active collections', {
      userId: userId.substring(0, 8),
      deletedReferrals: referralsSnapshot.size,
      deletedRewards: rewardsSnapshot.size,
      deletedReels: reelsSnapshot.size,
      deletedChallenges: challengesSnapshot.size,
    });
    
    // 3. Anonymize analytics (keep for insights, strip PII)
    await anonymizeAnalyticsData(userId);
    
    // 4. Schedule Firebase Auth deletion (after 30 days)
    await db.collection('scheduled_deletions').add({
      userId,
      scheduledFor: admin.firestore.Timestamp.fromDate(purgeDate),
      type: 'firebase_auth',
      createdAt: now,
    });
    
    logger.info('✅ User data deletion complete', {
      userId: userId.substring(0, 8),
      purgeDate: purgeDate.toISOString(),
    });
  } catch (error: any) {
    logger.error('❌ Failed to delete user data', {
      userId: userId.substring(0, 8),
      error: error.message,
    });
    throw error;
  }
}

/**
 * Anonymize analytics data (keep for insights, strip PII)
 */
async function anonymizeAnalyticsData(userId: string): Promise<void> {
  const db = getDb();
  
  try {
    // Anonymize agent logs
    const agentLogsSnapshot = await db
      .collection('agent_logs')
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    agentLogsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        userId: 'deleted_user',
        anonymized: true,
        anonymizedAt: admin.firestore.Timestamp.now(),
      });
    });
    
    // Anonymize loop exposures
    const loopExposuresSnapshot = await db
      .collection('loop_exposures')
      .where('userId', '==', userId)
      .get();
    
    loopExposuresSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        userId: 'deleted_user',
        anonymized: true,
        anonymizedAt: admin.firestore.Timestamp.now(),
      });
    });
    
    await batch.commit();
    
    logger.info('✅ Analytics data anonymized', {
      userId: userId.substring(0, 8),
      anonymizedAgentLogs: agentLogsSnapshot.size,
      anonymizedLoopExposures: loopExposuresSnapshot.size,
    });
  } catch (error: any) {
    logger.error('❌ Failed to anonymize analytics data', {
      userId: userId.substring(0, 8),
      error: error.message,
    });
    // Don't throw - continue with deletion
  }
}

