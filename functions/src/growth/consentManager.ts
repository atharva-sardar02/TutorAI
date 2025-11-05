/**
 * Consent Manager
 * PR19: Progress Reels
 * 
 * Manages user consent for data sharing and progress reels
 * Implements dual storage: profile flag + audit trail
 * 
 * COPPA/FERPA compliant consent management
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const getDb = () => admin.firestore();

/**
 * Update user consent for data sharing
 * 
 * Dual storage strategy:
 * 1. Quick access flag in /users/{userId}.consents
 * 2. Audit trail in /consents/{userId}/history/{logId}
 * 
 * @param userId - User ID
 * @param consentType - Type of consent being updated
 * @param granted - Whether consent is granted (true) or revoked (false)
 * @param triggeredBy - Who initiated the change (user, parent, or system)
 */
export async function updateConsent(
  userId: string,
  consentType: 'progressSharing' | 'dataSharing',
  granted: boolean,
  triggeredBy: 'user' | 'parent' | 'system' = 'user'
): Promise<void> {
  const db = getDb();
  const timestamp = admin.firestore.Timestamp.now();
  
  logger.info(`${granted ? '✅' : '🚫'} Updating consent`, {
    userId: userId.substring(0, 8),
    consentType,
    granted,
    triggeredBy,
  });
  
  try {
    // Update user profile (quick access)
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      [`consents.${consentType}`]: granted,
      [`consents.updatedAt`]: timestamp,
      [`consents.${granted ? 'grantedAt' : 'revokedAt'}`]: timestamp,
    });
    
    // Create audit log entry (compliance trail)
    await db.collection('consents').doc(userId).collection('history').add({
      userId,
      consentType,
      action: granted ? 'granted' : 'revoked',
      timestamp,
      metadata: { triggeredBy },
    });
    
    logger.info(`✅ Consent ${granted ? 'granted' : 'revoked'}`, {
      userId: userId.substring(0, 8),
      consentType,
      triggeredBy,
    });
  } catch (error: any) {
    logger.error('❌ Failed to update consent', {
      userId: userId.substring(0, 8),
      consentType,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Check if user has granted consent for a specific type
 * 
 * @param userId - User ID
 * @param consentType - Type of consent to check
 * @returns true if user has granted consent, false otherwise
 */
export async function checkConsent(
  userId: string,
  consentType: 'progressSharing' | 'dataSharing'
): Promise<boolean> {
  const db = getDb();
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    const hasConsent = userData?.consents?.[consentType] === true;
    
    logger.info('🔍 Consent check', {
      userId: userId.substring(0, 8),
      consentType,
      hasConsent,
    });
    
    return hasConsent;
  } catch (error: any) {
    logger.error('❌ Failed to check consent', {
      userId: userId.substring(0, 8),
      consentType,
      error: error.message,
    });
    return false; // Default to no consent on error
  }
}

