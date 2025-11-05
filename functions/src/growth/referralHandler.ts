import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { generateReferralLink, verifyReferralLink } from '../utils/links';
import { hashSensitive, generateSecureRandom } from '../utils/crypto';

// Lazy-load Firestore to avoid initialization issues
const getDb = () => admin.firestore();

/**
 * Cloud Function: Create referral link
 * 
 * Called by: Mobile app when user initiates share (tutor card, progress reel, etc.)
 * 
 * Flow:
 * 1. Validate user is authenticated
 * 2. Create referral document in Firestore
 * 3. Generate signed link with HMAC
 * 4. Return link to client for sharing
 */
export const createReferralLink = onCall(async (request) => {
  const { auth, data } = request;
  
  // Require authentication
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { loopType, targetType, metadata } = data;
  
  // Validate required fields
  if (!loopType) {
    throw new HttpsError('invalid-argument', 'loopType is required');
  }
  
  // Validate loopType enum
  const validLoopTypes = ['tutor_card', 'progress_reel', 'study_buddy', 'parent_pod', 'tutor_peer', 'results'];
  if (!validLoopTypes.includes(loopType)) {
    throw new HttpsError('invalid-argument', `Invalid loopType: ${loopType}`);
  }
  
  try {
    const db = getDb();
    
    // Get user role from profile
    const userDoc = await db.doc(`users/${auth.uid}`).get();
    const userData = userDoc.data();
    const referrerType = userData?.role || 'parent';
    
    // Use internal helper to create referral
    const result = await createReferralInternal({
      referrerId: auth.uid,
      referrerType,
      loopType,
      targetType,
      metadata,
    });
    
    return result;
  } catch (error: any) {
    logger.error('❌ Referral creation failed', {
      error: error.message,
      userId: auth.uid.substring(0, 8),
      loopType,
    });
    throw new HttpsError('internal', 'Failed to create referral');
  }
});

/**
 * Cloud Function: Track referral click (first touch)
 * 
 * Called by: Landing page or deep link handler when user clicks referral link
 * 
 * Flow:
 * 1. Verify HMAC signature (prevent tampering)
 * 2. Check referral exists and not expired
 * 3. Update referral status to 'clicked'
 * 4. Store device hints (hashed) for fraud detection
 */
export const trackReferralClick = onCall(async (request) => {
  const { data } = request;
  const { referralId, loopType, signature, deviceHints } = data;
  
  // Validate required fields
  if (!referralId || !signature || !loopType) {
    throw new HttpsError('invalid-argument', 'Missing required fields: referralId, signature, loopType');
  }
  
  try {
    const db = getDb();
    
    // Verify HMAC signature (prevent tampering)
    if (!verifyReferralLink(referralId, loopType, signature)) {
      logger.warn('⚠️ Invalid signature', {
        referralId: referralId.substring(0, 8),
        loopType,
      });
      
      // Log to attribution failures
      await getDb().collection('attribution_failures').add({
        referralId,
        errorType: 'invalid_signature',
        error: 'HMAC signature verification failed',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { loopType, signature: signature.substring(0, 16) },
      });
      
      throw new HttpsError('permission-denied', 'Invalid signature');
    }
    
    // Get referral doc
    const referralRef = db.collection('referrals').doc(referralId);
    const referralDoc = await referralRef.get();
    
    if (!referralDoc.exists) {
      throw new HttpsError('not-found', 'Referral not found');
    }
    
    const referral = referralDoc.data();
    
    // Check expiration
    if (referral?.expiresAt && referral.expiresAt.toDate() < new Date()) {
      await referralRef.update({ status: 'expired' });
      throw new HttpsError('failed-precondition', 'Referral expired');
    }
    
    // Update referral (idempotent - only if not already clicked)
    if (referral?.status === 'pending') {
      await referralRef.update({
        status: 'clicked',
        clickedAt: admin.firestore.FieldValue.serverTimestamp(),
        deviceHints: {
          deviceId: deviceHints?.deviceId ? hashSensitive(deviceHints.deviceId) : null,
          userAgent: deviceHints?.userAgent || null,
          ipHash: deviceHints?.ip ? hashSensitive(deviceHints.ip) : null,
          platform: deviceHints?.platform || null,
        },
      });
      
      logger.info('✅ Referral click tracked', {
        referralId: referralId.substring(0, 8),
        loopType,
        platform: deviceHints?.platform,
      });
    } else {
      logger.info('✅ Referral already clicked (idempotent)', {
        referralId: referralId.substring(0, 8),
        status: referral?.status,
      });
    }
    
    return { success: true, referralId };
  } catch (error: any) {
    logger.error('❌ Click tracking failed', {
      error: error.message,
      referralId: referralId?.substring(0, 8),
    });
    
    // Log to attribution failures for manual review
    if (!(error instanceof HttpsError)) {
      await getDb().collection('attribution_failures').add({
        referralId,
        errorType: 'click_tracking_failed',
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    throw error;
  }
});

/**
 * Associate referral with user on signup
 * 
 * Called by: Auth signup flow after user creates account
 * NOT a Cloud Function - called from other functions
 * 
 * Flow:
 * 1. Check if referralId exists
 * 2. Update referral with new user ID
 * 3. Update user profile with referral metadata
 * 4. Status: pending -> clicked -> signed_up
 */
export async function associateReferralOnSignup(
  userId: string,
  referralId?: string
): Promise<void> {
  if (!referralId) {
    logger.info('⏭️ No referral ID for signup', {
      userId: userId.substring(0, 8),
    });
    return;
  }
  
  try {
    const db = getDb();
    const referralRef = db.collection('referrals').doc(referralId);
    const referralDoc = await referralRef.get();
    
    if (!referralDoc.exists) {
      logger.warn('⚠️ Referral not found on signup', {
        referralId: referralId.substring(0, 8),
        userId: userId.substring(0, 8),
      });
      return;
    }
    
    const referral = referralDoc.data();
    
    // Update referral with user ID
    await referralRef.update({
      referredUserId: userId,
      status: 'signed_up',
      signedUpAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Update user document with referral metadata
    await db.doc(`users/${userId}`).update({
      referralId,
      referredBy: referral?.referrerId,
      referralLoopType: referral?.loopType,
    });
    
    logger.info('✅ Referral associated on signup', {
      userId: userId.substring(0, 8),
      referralId: referralId.substring(0, 8),
      referrerId: referral?.referrerId?.substring(0, 8),
      loopType: referral?.loopType,
    });
  } catch (error: any) {
    logger.error('❌ Referral association failed', {
      error: error.message,
      userId: userId.substring(0, 8),
      referralId: referralId?.substring(0, 8),
    });
    
    // Log failure but don't block signup
    await getDb().collection('attribution_failures').add({
      userId,
      referralId,
      errorType: 'signup_association_failed',
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Admin endpoint: Query referrals for debugging
 * 
 * Usage: View attribution chains, debug failed referrals
 */
export const getReferralChain = onCall(async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Admin auth required');
  }
  
  const db = getDb();
  
  // TODO: Add admin role check
  // const userDoc = await db.doc(`users/${auth.uid}`).get();
  // if (!userDoc.data()?.admin) {
  //   throw new HttpsError('permission-denied', 'Admin access required');
  // }
  
  const { referrerId, referredUserId, status, limit = 50 } = data;
  
  try {
    let query: admin.firestore.Query = db.collection('referrals');
    
    // Apply filters
    if (referrerId) {
      query = query.where('referrerId', '==', referrerId);
    }
    
    if (referredUserId) {
      query = query.where('referredUserId', '==', referredUserId);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Order and limit
    query = query.orderBy('createdAt', 'desc').limit(limit);
    
    const snapshot = await query.get();
    const referrals = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    logger.info('✅ Admin query successful', {
      filters: { referrerId, referredUserId, status },
      count: referrals.length,
    });
    
    return { referrals, count: referrals.length };
  } catch (error: any) {
    logger.error('❌ Admin query failed', { error: error.message });
    throw new HttpsError('internal', 'Query failed');
  }
});

/**
 * Helper: Generate unique referral ID
 * 
 * Format: ref_{timestamp}_{random}
 * Example: ref_1730000000_a3f9b2
 */
function generateReferralId(): string {
  const timestamp = Date.now();
  const random = generateSecureRandom(6);
  return `ref_${timestamp}_${random}`;
}

/**
 * Helper: Create referral (internal use)
 * 
 * This is the core logic for creating referrals, extracted so it can be
 * called from both the Cloud Function (createReferralLink) and other
 * internal functions (like generateTutorCard).
 * 
 * @param params - Referral creation parameters
 * @returns Referral data with ID, URL, and provider
 */
export async function createReferralInternal(params: {
  referrerId: string;
  referrerType: 'tutor' | 'parent' | 'student';
  loopType: string;
  targetType?: string;
  metadata?: any;
}): Promise<{ referralId: string; url: string; provider: string }> {
  const { referrerId, referrerType, loopType, targetType, metadata } = params;
  
  const db = getDb();
  
  // Generate unique referral ID
  const referralId = generateReferralId();
  
  // Create referral document
  const referral = {
    referralId,
    referrerId,
    referrerType,
    targetType: targetType || 'any',
    loopType,
    status: 'pending',
    metadata: {
      experimentId: metadata?.experimentId || 'default',
      variantId: metadata?.variantId || 'control',
      channel: metadata?.channel || 'unknown',
      ...metadata,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    ),
  };
  
  // Write to Firestore (idempotent - use referralId as doc ID)
  await db.collection('referrals').doc(referralId).set(referral);
  
  // Generate signed link
  const { url, provider } = await generateReferralLink({
    referralId,
    referrerId,
    loopType,
    experimentId: metadata?.experimentId,
    variantId: metadata?.variantId,
    channel: metadata?.channel,
  });
  
  logger.info('✅ Referral created (internal)', {
    referralId: referralId.substring(0, 8),
    referrerId: referrerId.substring(0, 8),
    loopType,
    provider,
  });
  
  return {
    referralId,
    url,
    provider,
  };
}

