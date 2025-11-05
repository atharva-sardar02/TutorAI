/**
 * Eligibility Rules for Viral Loops (PR16)
 * 
 * Defines when users are eligible to see each type of viral prompt
 */

export interface EligibilityRules {
  minSessions?: number;        // Minimum sessions completed
  minRating?: number;           // Minimum average rating
  maxExposuresPerDay?: number;  // Max times shown per day
  requiredRole?: 'tutor' | 'parent' | 'student';
  cooldownMs: number;           // Minimum time between shows
}

/**
 * Eligibility rules for each viral loop
 * 
 * These rules ensure users only see prompts when they're likely to engage:
 * - Role matching (tutor sees tutor prompts, etc.)
 * - Quality gates (min rating, min sessions)
 * - Frequency limits (cooldown, max per day)
 */
export const LOOP_ELIGIBILITY: Record<string, EligibilityRules> = {
  /**
   * Tutor Card (PR18)
   * 
   * Prompt tutors with high ratings to share their testimonial card
   * Example: "Share your 5★ rating with potential students!"
   */
  tutor_card: {
    requiredRole: 'tutor',
    minRating: 4.5,              // Only high-rated tutors
    minSessions: 5,              // At least 5 sessions completed
    maxExposuresPerDay: 1,       // Once per day max
    cooldownMs: 7 * 24 * 60 * 60 * 1000, // 7 days between prompts
  },
  
  /**
   * Progress Reel (PR19)
   * 
   * Prompt parents to share student progress highlights
   * Example: "Share your child's math progress with family!"
   */
  progress_reel: {
    requiredRole: 'parent',
    minSessions: 3,              // At least 3 sessions to have progress
    maxExposuresPerDay: 1,
    cooldownMs: 48 * 60 * 60 * 1000, // 48 hours (less frequent, high effort)
  },
  
  /**
   * Study Buddy Challenge (PR23)
   * 
   * Prompt students to challenge friends with quiz
   * Example: "Challenge a friend! Beat my score on this algebra quiz"
   */
  study_buddy: {
    requiredRole: 'student',
    minSessions: 2,              // Engaged students
    maxExposuresPerDay: 2,       // Can challenge multiple friends per day
    cooldownMs: 48 * 60 * 60 * 1000, // 48 hours per challenge
  },
  
  /**
   * Parent Pod Invites (PR24)
   * 
   * Prompt parents to invite other parents to group/cohort
   * Example: "Invite other parents to join your study group"
   */
  parent_pod: {
    requiredRole: 'parent',
    minSessions: 1,              // Low barrier (group growth)
    maxExposuresPerDay: 1,
    cooldownMs: 7 * 24 * 60 * 60 * 1000, // 7 days (less spam)
  },
  
  /**
   * Tutor→Tutor Referral (PR24)
   * 
   * Prompt tutors to recommend other tutors (complementary subjects)
   * Example: "Know a great physics tutor? Refer them and earn XP"
   */
  tutor_peer: {
    requiredRole: 'tutor',
    minSessions: 10,             // Established tutors only
    minRating: 4.0,              // Good standing
    maxExposuresPerDay: 1,
    cooldownMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  /**
   * Results Sharing (PR26)
   * 
   * Prompt users to share test/practice results
   * Example: "Share your test results! Show your progress"
   */
  results: {
    // No role requirement (all users can share results)
    minSessions: 1,
    maxExposuresPerDay: 2,       // Can share multiple results per day
    cooldownMs: 24 * 60 * 60 * 1000, // 24 hours
  },
};

/**
 * Get eligibility rules for a loop type
 * 
 * @param loopType - Type of viral loop
 * @returns Eligibility rules or null if loop doesn't exist
 */
export function getEligibilityRules(loopType: string): EligibilityRules | null {
  return LOOP_ELIGIBILITY[loopType] || null;
}

/**
 * Get all loop types that are configured
 */
export function getConfiguredLoops(): string[] {
  return Object.keys(LOOP_ELIGIBILITY);
}

/**
 * Check if a loop type is configured
 */
export function isLoopConfigured(loopType: string): boolean {
  return loopType in LOOP_ELIGIBILITY;
}

