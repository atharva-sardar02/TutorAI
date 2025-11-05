import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { createReferralInternal } from './referralHandler';
import { v4 as uuidv4 } from 'uuid';

const getDb = () => admin.firestore();

/**
 * Generate Tutor Peer referral link
 * Callable function for tutors to refer other tutors
 */
export const createTutorPeerReferral = onCall(async (request) => {
  const { auth, data } = request;
  const { targetTutorEmail, complementarySubject, personalMessage } = data;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const db = getDb();
    
    // Verify user is tutor
    const userDoc = await db.doc(`users/${auth.uid}`).get();
    const userType = userDoc.data()?.userType;
    const tutorName = userDoc.data()?.displayName || 'A Fellow Tutor';
    
    if (userType !== 'tutor') {
      throw new HttpsError('permission-denied', 'Only tutors can create peer referrals');
    }
    
    // Create referral tracking
    const referralData = await createReferralInternal({
      referrerId: auth.uid,
      referrerType: 'tutor',
      targetType: 'tutor',
      loopType: 'tutor_peer',
      metadata: {
        targetEmail: targetTutorEmail,
        complementarySubject,
        referrerName: tutorName,
        personalMessage: personalMessage || '',
      },
    });
    
    // Generate deep link URL
    const referralUrl = `https://messageai.app/join/tutor?ref=${referralData.referralId}`;
    
    logger.info('✅ Tutor peer referral created', {
      tutorId: auth.uid.substring(0, 8),
      referralId: referralData.referralId,
      targetEmail: targetTutorEmail ? 'provided' : 'none',
    });
    
    return {
      success: true,
      referralUrl,
      referralId: referralData.referralId,
      referrerName: tutorName,
    };
  } catch (error: any) {
    logger.error('❌ Failed to create tutor peer referral', {
      error: error.message,
      userId: auth.uid.substring(0, 8),
    });
    throw new HttpsError('internal', error.message || 'Failed to create referral');
  }
});

/**
 * Issue rewards when referred tutor signs up
 * Called by: trackReferralClick after tutor completes onboarding
 */
export async function issueTutorPeerRewards(
  referrerId: string,
  newTutorId: string,
  referralId: string
): Promise<void> {
  try {
    const db = getDb();
    
    // Issue XP to both tutors
    await db.collection(`rewards/${referrerId}/grants`).add({
      loopType: 'tutor_peer',
      xp: 100,
      reason: 'Referred a tutor',
      grantedAt: admin.firestore.Timestamp.now(),
      metadata: { newTutorId, referralId },
      requestKey: `tutorpeer_referrer_${uuidv4()}`,
    });
    
    await db.collection(`rewards/${newTutorId}/grants`).add({
      loopType: 'tutor_peer',
      xp: 50,
      reason: 'Joined via tutor referral',
      grantedAt: admin.firestore.Timestamp.now(),
      metadata: { referrerId, referralId },
      requestKey: `tutorpeer_new_${uuidv4()}`,
    });
    
    // Update balances
    await db.collection('balances').doc(referrerId).set({
      xp: admin.firestore.FieldValue.increment(100),
    }, { merge: true });
    
    await db.collection('balances').doc(newTutorId).set({
      xp: admin.firestore.FieldValue.increment(50),
    }, { merge: true });
    
    logger.info('🎁 Tutor peer rewards issued', {
      referrerId: referrerId.substring(0, 8),
      newTutorId: newTutorId.substring(0, 8),
      referralId,
    });
  } catch (error: any) {
    logger.error('❌ Failed to issue tutor peer rewards', {
      error: error.message,
      referrerId: referrerId.substring(0, 8),
    });
  }
}

