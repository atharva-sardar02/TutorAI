/**
 * Consent Revocation Trigger
 * PR19: Progress Reels
 * 
 * Automatically deletes all progress reels when user revokes consent
 * Ensures COPPA/FERPA compliance with right-to-be-forgotten
 * 
 * Firestore Trigger: users/{userId} (onUpdate)
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

const getDb = () => admin.firestore();

/**
 * Trigger function: Detects consent revocation and deletes reels
 * 
 * Watches for changes to /users/{userId}.consents.progressSharing
 * When changed from true → false, deletes all reels for that user
 * 
 * Ensures compliance with data privacy regulations
 */
export const onConsentRevoked = onDocumentUpdated({
  document: 'users/{userId}',
  region: 'us-central1',
  memory: '256MiB',
}, async (event) => {
  const userId = event.params.userId;
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  
  if (!before || !after) {
    return; // Skip if document was created or deleted
  }
  
  // Check if progressSharing consent was revoked
  const wasGranted = before.consents?.progressSharing === true;
  const isRevoked = after.consents?.progressSharing === false;
  
  if (wasGranted && isRevoked) {
    logger.info('🚨 Progress sharing consent revoked, deleting reels', { 
      userId: userId.substring(0, 8) 
    });
    
    const db = getDb();
    
    try {
      // Query all reels for this user
      const reelsSnapshot = await db
        .collection('reels')
        .where('userId', '==', userId)
        .get();
      
      if (reelsSnapshot.empty) {
        logger.info('ℹ️ No reels to delete', {
          userId: userId.substring(0, 8),
        });
        return;
      }
      
      // Delete all reels in batch
      const batch = db.batch();
      reelsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      logger.info('✅ Reels deleted after consent revocation', {
        userId: userId.substring(0, 8),
        deletedCount: reelsSnapshot.size,
      });
    } catch (error: any) {
      logger.error('❌ Failed to delete reels after consent revocation', {
        userId: userId.substring(0, 8),
        error: error.message,
        stack: error.stack,
      });
      
      // Don't throw - log to failed operations for manual retry
      await db.collection('failed_operations').add({
        operation: 'consent_revocation_cleanup',
        userId,
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        retry: false, // Manual review required
      });
    }
  }
});

