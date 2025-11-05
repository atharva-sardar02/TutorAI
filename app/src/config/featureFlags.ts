import type { GrowthFeatureFlags } from '@/types/growthTypes';

/**
 * Feature flags for growth/viral features (PR15+)
 * 
 * These flags control:
 * - Master kill-switch for all growth features
 * - Per-feature toggles for A/B testing
 * - Provider selection (Firebase/Branch/Custom)
 * 
 * In production, these can be:
 * - Stored in Firestore (/feature_flags collection)
 * - Managed via Firebase Remote Config
 * - Controlled by admin dashboard (PR29)
 */
export const GROWTH_FEATURE_FLAGS: GrowthFeatureFlags = {
  // Master kill-switch - disables all growth features
  enabled: true,
  
  // PR15: Referral Attribution System
  referralAttribution: {
    enabled: true,
    provider: 'custom', // 'firebase' (deprecated), 'branch', or 'custom'
  },
  
  // PR16: Loop Orchestrator
  orchestrator: {
    enabled: true, // ✅ Enabled for PR16
  },
  
  // PR17: A/B Experiments
  experiments: {
    enabled: true, // ✅ Enabled for PR17
  },
  
  // PR25: Incentives & Economy
  incentives: {
    enabled: true, // ✅ Enabled for PR25
  },
  
  // PR17.5: Personalization Agent
  personalization: {
    enabled: true, // ✅ Enabled for PR17.5
    useLocalizedCopy: true,
    supportedLocales: ['en', 'es', 'fr'],
  },
  
  // PR26: Micro-FVM & Results
  microFVM: {
    enabled: true, // ✅ Enabled for PR26
    supportedSubjects: ['Math', 'Science', 'English'],
    timeLimit: 90, // seconds
  },
  results: {
    sharingEnabled: false, // Phase 2
  },
  
  // PR21: Activity Feed
  activityFeed: {
    enabled: true, // ✅ Enabled for PR21
    refreshInterval: 5, // minutes - matches Cloud Function schedule
  },

  // PR27: Cohort Rooms & Leaderboards
  cohortRooms: { enabled: true },
  leaderboards: { enabled: true },
  
  // PR22: Fraud Detection
  fraud: {
    detectionEnabled: true,
    captchaEnabled: true,
    autoBlockThreshold: 91,
    captchaThreshold: 71,
  },
  
  // Viral Loop Toggles
  loops: {
    tutorCard: { enabled: true },       // PR18 ✅
    progressReel: { enabled: true },    // PR19 ✅
    studyBuddy: { enabled: true },      // PR23 ✅
    parentChildChallenge: { enabled: true }, // PR30 - Parent-child challenges
    parentPod: { enabled: true },       // PR24 ✅ - Parent pod invites
    tutorPeer: { enabled: true },       // PR24 ✅ - Tutor peer referrals
  },
};

/**
 * Check if a specific growth feature is enabled
 * 
 * Respects master kill-switch (GROWTH_FEATURE_FLAGS.enabled)
 */
export function isGrowthFeatureEnabled(feature: keyof Omit<GrowthFeatureFlags, 'enabled'>): boolean {
  if (!GROWTH_FEATURE_FLAGS.enabled) {
    return false; // Master kill-switch disabled
  }
  
  const featureConfig = GROWTH_FEATURE_FLAGS[feature];
  
  if (typeof featureConfig === 'object' && 'enabled' in featureConfig) {
    return featureConfig.enabled;
  }
  
  return false;
}

/**
 * Check if a specific viral loop is enabled
 */
export function isLoopEnabled(loopType: keyof GrowthFeatureFlags['loops']): boolean {
  if (!GROWTH_FEATURE_FLAGS.enabled) {
    return false;
  }
  
  return GROWTH_FEATURE_FLAGS.loops[loopType]?.enabled || false;
}

