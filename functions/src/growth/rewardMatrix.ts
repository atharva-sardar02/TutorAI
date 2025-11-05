import { RewardConfig, RewardMatrix } from '../types/incentiveTypes';

/**
 * Reward matrix: loopType × persona × subject → reward
 * 
 * This defines what rewards users get for different viral actions
 * based on their role and subject area.
 */
export const REWARD_MATRIX: RewardMatrix = {
  // Tutor Card sharing
  tutor_card: {
    tutor: {
      math: { type: 'xp', amount: 110, description: 'Math tutor card shared' }, // +10% for math
      science: { type: 'xp', amount: 105, description: 'Science tutor card shared' }, // +5% for science
      default: { type: 'xp', amount: 100, description: 'Tutor card shared' },
    },
    parent: {
      default: { type: 'xp', amount: 50, description: 'Shared tutor card' },
    },
    student: {
      default: { type: 'xp', amount: 50, description: 'Shared tutor card' },
    },
  },
  
  // Progress reel sharing
  progress_reel: {
    tutor: {
      default: { type: 'class_pass', amount: 1, description: 'Progress reel bonus', expiresInDays: 90 },
    },
    parent: {
      default: { type: 'class_pass', amount: 1, description: 'Shared progress', expiresInDays: 90 },
    },
    student: {
      default: { type: 'xp', amount: 75, description: 'Shared progress' },
    },
  },
  
  // Study buddy challenge
  study_buddy: {
    student: {
      default: { type: 'streak_shield', amount: 1, description: 'Challenge completed', expiresInDays: 7 },
    },
    tutor: {
      default: { type: 'xp', amount: 50, description: 'Study buddy facilitated' },
    },
    parent: {
      default: { type: 'xp', amount: 50, description: 'Study buddy facilitated' },
    },
  },
  
  // Parent pod invites
  parent_pod: {
    parent: {
      default: { type: 'class_pass', amount: 1, description: 'Parent pod invite', expiresInDays: 90 },
    },
    tutor: {
      default: { type: 'xp', amount: 75, description: 'Pod facilitated' },
    },
    student: {
      default: { type: 'xp', amount: 25, description: 'Pod joined' },
    },
  },
  
  // Tutor-to-tutor referral
  tutor_peer: {
    tutor: {
      default: { type: 'xp', amount: 200, description: 'Tutor referral bonus' },
    },
    parent: {
      default: { type: 'xp', amount: 50, description: 'Tutor referral' },
    },
    student: {
      default: { type: 'xp', amount: 50, description: 'Tutor referral' },
    },
  },
  
  // Results sharing
  results: {
    student: {
      default: { type: 'xp', amount: 50, description: 'Results shared' },
    },
    parent: {
      default: { type: 'xp', amount: 50, description: 'Results shared' },
    },
    tutor: {
      default: { type: 'xp', amount: 75, description: 'Results facilitated' },
    },
  },
};

/**
 * Get reward configuration for a specific loop + persona + subject
 */
export function getRewardConfig(
  loopType: string,
  persona: string,
  subject?: string
): RewardConfig {
  const loopRewards = REWARD_MATRIX[loopType];
  if (!loopRewards) {
    // Default reward if loop not in matrix
    return { type: 'xp', amount: 50, description: 'Participation bonus' };
  }
  
  const personaRewards = loopRewards[persona];
  if (!personaRewards) {
    // Fallback to 'default' persona or parent
    const fallbackRewards = loopRewards.default || loopRewards.parent || loopRewards.tutor;
    if (!fallbackRewards) {
      return { type: 'xp', amount: 50, description: 'Participation bonus' };
    }
    return fallbackRewards.default || fallbackRewards[Object.keys(fallbackRewards)[0]];
  }
  
  // Try subject-specific reward, then default
  const subjectReward = subject ? personaRewards[subject.toLowerCase()] : null;
  return subjectReward || personaRewards.default || personaRewards[Object.keys(personaRewards)[0]];
}

/**
 * Default reward policy
 */
export const DEFAULT_REWARD_POLICY = {
  dailyCaps: {
    classPassTotal: 100,
    xpTotal: 10000,
  },
  perUserCaps: {
    classPassPerMonth: 5,
    xpPerWeek: 1000,
  },
  expirations: {
    classPassDays: 90,
    streakShieldDays: 7,
  },
  abuseLimits: {
    maxRewardsPerDay: 10,
  },
};

