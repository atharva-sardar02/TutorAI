import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { Balance, RewardConfig } from '@/types/growthTypes';

/**
 * Issue reward to user
 */
export async function issueReward(
  loopType: string,
  context?: {
    rating?: number;
    sessionCount?: number;
    subject?: string;
  },
  requestKey?: string
): Promise<{
  success: boolean;
  reward?: RewardConfig;
  rationale: string;
  balances?: Balance;
}> {
  try {
    const issueRewardFn = httpsCallable(functions, 'issueReward');
    const result = await issueRewardFn({ loopType, context, requestKey });
    return result.data as any;
  } catch (error: any) {
    console.error('❌ Error issuing reward:', error);
    throw error;
  }
}

/**
 * Redeem reward (e.g., use class pass)
 */
export async function redeemReward(
  type: 'xp' | 'class_pass' | 'streak_shield' | 'badge',
  amount: number,
  metadata?: any
): Promise<{ success: boolean; remainingBalance: number }> {
  try {
    const redeemRewardFn = httpsCallable(functions, 'redeemReward');
    const result = await redeemRewardFn({ type, amount, metadata });
    return result.data as any;
  } catch (error: any) {
    console.error('❌ Error redeeming reward:', error);
    throw error;
  }
}

/**
 * Get user's current balance
 */
export async function getUserBalance(): Promise<{
  xpBalance: number;
  classPassCount: number;
  streakShieldCount: number;
  badgeCount: number;
}> {
  try {
    const getBalanceFn = httpsCallable(functions, 'getUserBalance');
    const result = await getBalanceFn();
    return result.data as any;
  } catch (error: any) {
    console.error('❌ Error getting balance:', error);
    throw error;
  }
}

