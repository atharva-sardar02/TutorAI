import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getRewardConfig, DEFAULT_REWARD_POLICY } from './rewardMatrix';
import { RewardConfig } from '../types/incentiveTypes';

const getDb = () => admin.firestore();

/**
 * Generate unique reward ID
 */
function generateRewardId(): string {
  return `rwd_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Generate unique request key for idempotency
 */
function generateRequestKey(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Cloud Function: Issue Reward
 * 
 * Grants a reward to a user based on viral loop completion
 * Features:
 * - Idempotent (requestKey prevents duplicates)
 * - Budget caps (daily + per-user)
 * - Anti-abuse checks
 * - Expiration tracking
 */
export const issueReward = onCall<
  {
    userId?: string;
    loopType: string;
    context?: {
      rating?: number;
      sessionCount?: number;
      subject?: string;
    };
    requestKey?: string;
  },
  Promise<{
    success: boolean;
    reward?: RewardConfig;
    rationale: string;
    balances?: any;
  }>
>(async (request) => {
  const { auth, data } = request;
  const { loopType, context, requestKey: providedKey } = data;
  const userId = data.userId || auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'Authentication required or userId must be provided.');
  }

  // Generate or use provided request key for idempotency
  const requestKey = providedKey || generateRequestKey();

  try {
    const db = getDb();

    // 1. Check for duplicate request (idempotency)
    const existingReward = await db
      .collection(`rewards/${userId}/grants`)
      .where('requestKey', '==', requestKey)
      .limit(1)
      .get();

    if (!existingReward.empty) {
      const existingData = existingReward.docs[0].data();
      logger.info('🔁 Duplicate reward request (idempotent)', {
        userId: userId.substring(0, 8),
        requestKey: requestKey.substring(0, 16),
      });
      return {
        success: true,
        reward: {
          type: existingData.type,
          amount: existingData.amount,
          description: existingData.description,
        },
        rationale: 'Already granted (idempotent)',
      };
    }

    // 2. Get user profile for persona
    const userDoc = await db.doc(`users/${userId}`).get();
    const userData = userDoc.data();
    const persona = userData?.role || 'parent';

    // 3. Determine reward from matrix
    const subject = context?.subject;
    const rewardConfig = getRewardConfig(loopType, persona, subject);

    // 4. Check abuse limits (max 10 rewards/day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = admin.firestore.Timestamp.fromDate(today);

    const todaysRewards = await db
      .collection(`rewards/${userId}/grants`)
      .where('grantedAt', '>=', todayTimestamp)
      .get();

    if (todaysRewards.size >= DEFAULT_REWARD_POLICY.abuseLimits.maxRewardsPerDay) {
      logger.warn('⚠️ User hit daily reward cap', {
        userId: userId.substring(0, 8),
        rewardsToday: todaysRewards.size,
      });
      return {
        success: false,
        rationale: `Daily reward limit reached (${DEFAULT_REWARD_POLICY.abuseLimits.maxRewardsPerDay}/day)`,
      };
    }

    // 5. Check per-user caps (class passes, XP)
    if (rewardConfig.type === 'class_pass') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoTimestamp = admin.firestore.Timestamp.fromDate(monthAgo);

      const monthlyClassPasses = await db
        .collection(`rewards/${userId}/grants`)
        .where('type', '==', 'class_pass')
        .where('grantedAt', '>=', monthAgoTimestamp)
        .get();

      if (monthlyClassPasses.size >= DEFAULT_REWARD_POLICY.perUserCaps.classPassPerMonth) {
        logger.warn('⚠️ User hit monthly class pass cap', {
          userId: userId.substring(0, 8),
          classPassesThisMonth: monthlyClassPasses.size,
        });
        return {
          success: false,
          rationale: `Monthly class pass limit reached (${DEFAULT_REWARD_POLICY.perUserCaps.classPassPerMonth}/month)`,
        };
      }
    }

    // 6. Check global daily caps (TODO: implement global counters)
    // For MVP, skip global caps (would require distributed counter)

    // 7. Calculate expiration
    let expiresAt: admin.firestore.Timestamp | undefined;
    if (rewardConfig.expiresInDays) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + rewardConfig.expiresInDays);
      expiresAt = admin.firestore.Timestamp.fromDate(expirationDate);
    }

    // 8. Grant reward (write to /rewards/{userId}/grants/{rewardId})
    const rewardId = generateRewardId();
    const rewardDoc = {
      rewardId,
      userId,
      type: rewardConfig.type,
      amount: rewardConfig.amount,
      description: rewardConfig.description,
      loopType,
      requestKey,
      grantedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt || null,
      clawedBack: false,
      metadata: { ...context, persona },
    };

    await db.doc(`rewards/${userId}/grants/${rewardId}`).set(rewardDoc);

    // 9. Update balances (atomic increment)
    const balanceRef = db.doc(`balances/${userId}`);
    const balanceFieldMap: Record<string, string> = {
      xp: 'xpBalance',
      class_pass: 'classPassCount',
      streak_shield: 'streakShieldCount',
      badge: 'badgeCount',
    };
    const balanceField = balanceFieldMap[rewardConfig.type] || 'xpBalance';

    await balanceRef.set(
      {
        userId,
        [balanceField]: admin.firestore.FieldValue.increment(rewardConfig.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 10. Log to audit trail
    await db.collection('rewards_audit_log').add({
      userId,
      action: 'grant',
      rewardType: rewardConfig.type,
      amount: rewardConfig.amount,
      loopType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { rewardId, requestKey },
    });

    logger.info('✅ Reward granted', {
      userId: userId.substring(0, 8),
      rewardId: rewardId.substring(0, 12),
      type: rewardConfig.type,
      amount: rewardConfig.amount,
      loopType,
    });

    // 11. Return success with updated balance
    const updatedBalance = await balanceRef.get();
    return {
      success: true,
      reward: rewardConfig,
      rationale: `Granted ${rewardConfig.amount} ${rewardConfig.type} for ${loopType}`,
      balances: updatedBalance.data(),
    };
  } catch (error: any) {
    logger.error('❌ Error issuing reward', {
      error: error.message,
      userId: userId?.substring(0, 8),
      loopType,
      stack: error.stack,
    });
    throw new HttpsError('internal', 'Failed to issue reward', error.message);
  }
});

/**
 * Cloud Function: Redeem Reward
 * 
 * Allows users to redeem their earned rewards (e.g., use a class pass)
 */
export const redeemReward = onCall<
  {
    type: 'xp' | 'class_pass' | 'streak_shield' | 'badge';
    amount: number;
    metadata?: any;
  },
  Promise<{ success: boolean; remainingBalance: number }>
>(async (request) => {
  const { auth, data } = request;
  const { type, amount, metadata } = data;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const userId = auth.uid;

  try {
    const db = getDb();
    const balanceRef = db.doc(`balances/${userId}`);

    // Run in transaction to prevent double-spend
    const result = await db.runTransaction(async (transaction) => {
      const balanceDoc = await transaction.get(balanceRef);

      if (!balanceDoc.exists) {
        throw new HttpsError('not-found', 'Balance not found. No rewards to redeem.');
      }

      const balanceData = balanceDoc.data()!;
      const balanceFieldMap: Record<string, string> = {
        xp: 'xpBalance',
        class_pass: 'classPassCount',
        streak_shield: 'streakShieldCount',
        badge: 'badgeCount',
      };
      const balanceField = balanceFieldMap[type];
      const currentBalance = balanceData[balanceField] || 0;

      // Check sufficient balance
      if (currentBalance < amount) {
        throw new HttpsError(
          'failed-precondition',
          `Insufficient balance. Have ${currentBalance}, need ${amount}.`
        );
      }

      // Deduct balance
      transaction.update(balanceRef, {
        [balanceField]: admin.firestore.FieldValue.increment(-amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log redemption
      const redemptionId = `red_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      transaction.set(db.doc(`redemptions/${userId}/history/${redemptionId}`), {
        redemptionId,
        userId,
        type,
        amount,
        description: `Redeemed ${amount} ${type}`,
        redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: metadata || {},
      });

      // Audit log
      transaction.set(db.collection('rewards_audit_log').doc(), {
        userId,
        action: 'redeem',
        rewardType: type,
        amount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { redemptionId, ...metadata },
      });

      return currentBalance - amount;
    });

    logger.info('✅ Reward redeemed', {
      userId: userId.substring(0, 8),
      type,
      amount,
      remainingBalance: result,
    });

    return { success: true, remainingBalance: result };
  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }

    logger.error('❌ Error redeeming reward', {
      error: error.message,
      userId: userId.substring(0, 8),
      type,
      amount,
    });
    throw new HttpsError('internal', 'Failed to redeem reward', error.message);
  }
});

/**
 * Cloud Function: Get User Balance
 */
export const getUserBalance = onCall(async (request) => {
  const { auth } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  try {
    const db = getDb();
    const balanceDoc = await db.doc(`balances/${auth.uid}`).get();

    if (!balanceDoc.exists) {
      // Return zero balances
      return {
        xpBalance: 0,
        classPassCount: 0,
        streakShieldCount: 0,
        badgeCount: 0,
      };
    }

    return balanceDoc.data();
  } catch (error: any) {
    logger.error('❌ Error getting balance', {
      error: error.message,
      userId: auth.uid.substring(0, 8),
    });
    throw new HttpsError('internal', 'Failed to get balance', error.message);
  }
});

/**
 * Admin function: Clawback reward (revoke due to fraud)
 */
export const clawbackReward = onCall<
  { userId: string; rewardId: string; reason: string },
  Promise<{ success: boolean }>
>(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Admin auth required.');
  }

  // TODO: Check admin role
  // const userDoc = await getDb().doc(`users/${auth.uid}`).get();
  // if (!userDoc.data()?.admin) {
  //   throw new HttpsError('permission-denied', 'Admin access required');
  // }

  const { userId, rewardId, reason } = data;

  try {
    const db = getDb();
    const rewardRef = db.doc(`rewards/${userId}/grants/${rewardId}`);
    const rewardDoc = await rewardRef.get();

    if (!rewardDoc.exists) {
      throw new HttpsError('not-found', 'Reward not found.');
    }

    const rewardData = rewardDoc.data()!;

    if (rewardData.clawedBack) {
      return { success: true }; // Already clawed back
    }

    // Mark as clawed back
    await rewardRef.update({
      clawedBack: true,
      clawedBackAt: admin.firestore.FieldValue.serverTimestamp(),
      clawbackReason: reason,
    });

    // Deduct from balance
    const balanceRef = db.doc(`balances/${userId}`);
    const balanceFieldMap: Record<string, string> = {
      xp: 'xpBalance',
      class_pass: 'classPassCount',
      streak_shield: 'streakShieldCount',
      badge: 'badgeCount',
    };
    const balanceField = balanceFieldMap[rewardData.type];

    await balanceRef.update({
      [balanceField]: admin.firestore.FieldValue.increment(-rewardData.amount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Audit log
    await db.collection('rewards_audit_log').add({
      userId,
      action: 'clawback',
      rewardType: rewardData.type,
      amount: rewardData.amount,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { rewardId, reason },
    });

    logger.info('✅ Reward clawed back', {
      userId: userId.substring(0, 8),
      rewardId: rewardId.substring(0, 12),
      reason,
    });

    return { success: true };
  } catch (error: any) {
    logger.error('❌ Error clawing back reward', {
      error: error.message,
      userId: userId?.substring(0, 8),
      rewardId: rewardId?.substring(0, 12),
    });
    throw new HttpsError('internal', 'Failed to clawback reward', error.message);
  }
});

