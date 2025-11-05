/**
 * Fallback content for when LLM/services are unavailable
 * 
 * These are static, generic templates that ensure the app
 * continues working even when AI services fail
 */

/**
 * Fallback copy templates by loop type
 */
export const FALLBACK_COPY: Record<string, Record<string, string>> = {
  tutor_card: {
    tutor: 'Share your success!',
    parent: 'Share your tutor!',
    student: 'Share your tutor!',
  },
  
  progress_reel: {
    tutor: 'Share progress!',
    parent: 'Share your child\'s progress!',
    student: 'Share your progress!',
  },
  
  study_buddy: {
    tutor: 'Challenge a friend!',
    parent: 'Challenge a friend!',
    student: 'Challenge a friend!',
  },
  
  parent_pod: {
    tutor: 'Invite others!',
    parent: 'Invite other parents!',
    student: 'Invite friends!',
  },
  
  tutor_peer: {
    tutor: 'Refer a tutor!',
    parent: 'Refer a tutor!',
    student: 'Refer a tutor!',
  },
  
  results: {
    tutor: 'Share your results!',
    parent: 'Share results!',
    student: 'Share your results!',
  },
};

/**
 * Get fallback copy for loop + persona
 */
export function getFallbackCopy(
  loopType: string,
  persona: string
): string {
  const loopCopy = FALLBACK_COPY[loopType];
  if (!loopCopy) {
    return 'Share your success!'; // Ultimate fallback
  }
  
  return loopCopy[persona] || loopCopy.tutor || 'Share!';
}

/**
 * Fallback rewards (for PR25 - Incentives)
 */
export const FALLBACK_REWARDS = {
  default: {
    type: 'xp',
    amount: 50,
    description: 'Bonus XP',
  },
  
  tutor_card: {
    type: 'xp',
    amount: 100,
    description: 'Sharing bonus',
  },
  
  progress_reel: {
    type: 'class_pass',
    amount: 1,
    description: 'Free class',
  },
  
  study_buddy: {
    type: 'streak_shield',
    amount: 1,
    description: 'Streak protection',
  },
};

/**
 * Get fallback reward for loop
 */
export function getFallbackReward(loopType: string): any {
  return FALLBACK_REWARDS[loopType as keyof typeof FALLBACK_REWARDS] || FALLBACK_REWARDS.default;
}

