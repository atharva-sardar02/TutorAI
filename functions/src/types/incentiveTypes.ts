/**
 * Incentive types for server-side use
 * (Mirrors app/src/types/growthTypes.ts but with server-specific fields)
 */

export type RewardType = 'xp' | 'class_pass' | 'streak_shield' | 'badge';

export interface RewardConfig {
  type: RewardType;
  amount: number;
  description: string;
  expiresInDays?: number;
}

export interface RewardMatrix {
  [loopType: string]: {
    [persona: string]: {
      [subject: string]: RewardConfig;
    };
  };
}

