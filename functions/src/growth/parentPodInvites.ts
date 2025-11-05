import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { createReferralInternal } from './referralHandler';

const getDb = () => admin.firestore();

/**
 * Generate Parent Pod invite link
 * Callable function for parents to invite others to their cohort
 */
export const createParentPodInvite = onCall(async (request) => {
  const { auth, data } = request;
  const { cohortId, cohortName } = data;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  if (!cohortId) {
    throw new HttpsError('invalid-argument', 'Cohort ID is required');
  }
  
  try {
    const db = getDb();
    
    // Verify user is parent
    const userDoc = await db.doc(`users/${auth.uid}`).get();
    const userType = userDoc.data()?.userType;
    
    if (userType !== 'parent') {
      throw new HttpsError('permission-denied', 'Only parents can create pod invites');
    }
    
    // Verify cohort exists
    const cohortDoc = await db.doc(`cohorts/${cohortId}`).get();
    if (!cohortDoc.exists) {
      throw new HttpsError('not-found', 'Cohort not found');
    }
    
    // Create referral tracking
    const referralData = await createReferralInternal({
      referrerId: auth.uid,
      referrerType: 'parent',
      targetType: 'parent',
      loopType: 'parent_pod',
      metadata: {
        cohortId,
        cohortName: cohortName || cohortDoc.data()?.name || 'Study Group',
      },
    });
    
    // Generate deep link URL
    const inviteUrl = `https://messageai.app/join/cohort/${cohortId}?ref=${referralData.referralId}`;
    
    logger.info('✅ Parent pod invite created', {
      parentId: auth.uid.substring(0, 8),
      cohortId,
      referralId: referralData.referralId,
    });
    
    return {
      success: true,
      inviteUrl,
      referralId: referralData.referralId,
      cohortId,
      cohortName: cohortName || 'Study Group',
    };
  } catch (error: any) {
    logger.error('❌ Failed to create parent pod invite', {
      error: error.message,
      userId: auth.uid.substring(0, 8),
    });
    throw new HttpsError('internal', error.message || 'Failed to create invite');
  }
});

