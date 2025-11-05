import { Timestamp } from "firebase/firestore";

// ============================================================================
// REFERRAL ATTRIBUTION TYPES (PR15)
// ============================================================================

/**
 * Referral tracking document
 * Collection: /referrals/{referralId}
 */
export interface Referral {
  referralId: string;          // Unique referral ID (e.g., "ref_1730000000_abc123")
  referrerId: string;          // User who created the referral
  referrerType: 'tutor' | 'parent' | 'student';
  targetType: 'tutor' | 'parent' | 'student' | 'any';
  loopType: 'tutor_card' | 'progress_reel' | 'study_buddy' | 'parent_pod' | 'tutor_peer' | 'results';
  status: 'pending' | 'clicked' | 'installed' | 'signed_up' | 'completed_fvm' | 'expired';
  
  // Attribution chain timestamps
  clickedAt?: Timestamp;
  installedAt?: Timestamp;
  signedUpAt?: Timestamp;
  completedFvmAt?: Timestamp;
  
  // Device hints (for fraud detection - PR22)
  deviceHints?: {
    deviceId?: string;         // Hashed device ID
    userAgent?: string;
    ipHash?: string;           // Hashed IP address
    platform?: 'ios' | 'android' | 'web';
  };
  
  // Metadata for experiments and analytics
  metadata?: {
    experimentId?: string;     // A/B test variant (default: 'default')
    variantId?: string;        // Control/treatment (default: 'control')
    channel?: string;          // Share method: 'whatsapp' | 'sms' | 'email' | 'copy'
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  
  // Timestamps
  createdAt: Timestamp;
  expiresAt: Timestamp;        // 30 days from creation
  
  // Set when user signs up
  referredUserId?: string;     // UID of the user who joined via this referral
}

/**
 * Attribution failure log (for manual review)
 * Collection: /attribution_failures/{failureId}
 */
export interface AttributionFailure {
  referralId?: string;
  userId?: string;
  errorType: 'click_tracking_failed' | 'signup_association_failed' | 'invalid_signature' | 'expired_link';
  error: string;
  timestamp: Timestamp;
  metadata?: any;
}

// ============================================================================
// FEATURE FLAGS (PR15)
// ============================================================================

export interface GrowthFeatureFlags {
  enabled: boolean;            // Master kill-switch for all growth features
  referralAttribution: {
    enabled: boolean;          // Kill-switch for PR15
    provider: 'firebase' | 'branch' | 'custom';
  };
  orchestrator: {
    enabled: boolean;          // PR16
  };
  experiments: {
    enabled: boolean;          // PR17 - A/B testing
  };
  incentives: {
    enabled: boolean;          // PR25
  };
  personalization: {           // PR17.5 - Localization
    enabled: boolean;
    useLocalizedCopy: boolean;
    supportedLocales: string[];
  };
  microFVM: {                  // PR26 - Micro-FVM Assessment
    enabled: boolean;
    supportedSubjects: string[];
    timeLimit: number;
  };
  results: {                   // PR26 - Results Sharing
    sharingEnabled: boolean;
  };
  activityFeed: {              // PR21 - Activity Feed
    enabled: boolean;
    refreshInterval: number;   // minutes
  };
  cohortRooms: {               // PR27 - Cohort Rooms
    enabled: boolean;
  };
  leaderboards: {              // PR27 - Mini-Leaderboards
    enabled: boolean;
  };
  loops: {
    tutorCard: { enabled: boolean };          // PR18
    progressReel: { enabled: boolean };       // PR19
    studyBuddy: { enabled: boolean };         // PR23
    parentPod: { enabled: boolean };          // PR24
    tutorPeer: { enabled: boolean };          // PR24
  };
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to create a referral link
 */
export interface CreateReferralLinkRequest {
  loopType: string;
  targetType?: 'tutor' | 'parent' | 'student' | 'any';
  metadata?: {
    experimentId?: string;
    variantId?: string;
    channel?: string;
    [key: string]: any;
  };
}

/**
 * Response from creating a referral link
 */
export interface CreateReferralLinkResponse {
  referralId: string;
  url: string;
  provider: string;
}

/**
 * Request to track a referral click
 */
export interface TrackReferralClickRequest {
  referralId: string;
  loopType: string;
  signature: string;
  deviceHints?: {
    deviceId?: string;
    userAgent?: string;
    ip?: string;
    platform?: 'ios' | 'android' | 'web';
  };
}

/**
 * Stored referral context (client-side)
 * Used for install-deferred attribution
 */
export interface ReferralContext {
  referralId: string;
  loopType: string;
  signature: string;
  clickedAt: number;           // Unix timestamp
  experimentId?: string;
  variantId?: string;
}

// ============================================================================
// ORCHESTRATOR TYPES (PR16)
// ============================================================================

/**
 * Orchestrator decision request
 */
export interface OrchestratorRequest {
  userId?: string;             // Optional - will use auth.uid if not provided
  userRole: 'tutor' | 'parent' | 'student';
  sessionContext?: {
    conversationId?: string;
    recentActivity?: string;
    sessionCount?: number;
    rating?: number;
  };
  requestedLoops?: string[];   // Optional: specific loops to check
}

/**
 * Orchestrator decision response
 */
export interface OrchestratorDecision {
  shouldShow: boolean;
  loopType?: string;
  persona: 'tutor' | 'parent' | 'student';
  locale?: string;             // PR17.5: User's locale for personalized copy (e.g., 'en', 'es', 'fr')
  copyKey?: string;
  cooldownMs?: number;
  experimentId?: string;
  variantId?: string;
  rationale: string;           // Why this decision was made (≤240 chars)
  decidedAt: number;           // Unix timestamp
}

/**
 * Cooldown tracking
 * Collection: /cooldowns/{userId}/loops/{loopType}
 */
export interface Cooldown {
  userId: string;
  loopType: string;
  lastShownAt: Timestamp;
  expiresAt: Timestamp;
  exposureCount: number;
}

/**
 * Loop exposure log
 * Collection: /loop_exposures/{exposureId}
 */
export interface LoopExposure {
  userId: string;
  loopType: string;
  decision: OrchestratorDecision;
  context: {
    userRole: string;
    sessionContext?: any;
  };
  timestamp: Timestamp;
}

/**
 * Eligibility rules per loop
 */
export interface EligibilityRules {
  minSessions?: number;        // e.g., 5 sessions for Tutor Spotlight
  minRating?: number;           // e.g., 4.5 rating for Tutor Card
  maxExposuresPerDay?: number;  // e.g., 1 prompt per 24h
  requiredRole?: 'tutor' | 'parent' | 'student';
  cooldownMs: number;           // Minimum time between prompts
}

// ============================================================================
// EXTENDED USER TYPE (adds referral fields)
// ============================================================================

/**
 * Extended User interface with referral fields
 * These fields are added to existing User type from index.ts
 */
export interface UserWithReferral {
  // Referral attribution
  referralId?: string;         // Which referral brought this user
  referredBy?: string;         // UID of the user who referred them
  referralLoopType?: string;   // Which loop was used
  
  // Incentives/rewards (PR25)
  xpBalance?: number;
  classPassCount?: number;
  streakShieldCount?: number;
}

// ============================================================================
// INCENTIVES & ECONOMY TYPES (PR25)
// ============================================================================

/**
 * Reward types supported by the system
 */
export type RewardType = 'xp' | 'class_pass' | 'streak_shield' | 'badge';

/**
 * Reward configuration
 */
export interface RewardConfig {
  type: RewardType;
  amount: number;
  description: string;
  expiresInDays?: number; // Optional expiration (e.g., 90 days for class passes)
}

/**
 * Granted reward record
 * Collection: /rewards/{userId}/grants/{rewardId}
 */
export interface Reward {
  rewardId: string;
  userId: string;
  type: RewardType;
  amount: number;
  description: string;
  loopType: string;           // Which loop granted this reward
  requestKey: string;          // Idempotency key
  grantedAt: Timestamp;
  expiresAt?: Timestamp;       // For time-limited rewards
  clawedBack?: boolean;        // True if revoked due to fraud
  clawedBackAt?: Timestamp;
  metadata?: { [key: string]: any };
}

/**
 * User balance aggregates
 * Collection: /balances/{userId}
 */
export interface Balance {
  userId: string;
  xpBalance: number;
  classPassCount: number;
  streakShieldCount: number;
  badgeCount: number;
  updatedAt: Timestamp;
}

/**
 * Redemption record
 * Collection: /redemptions/{userId}/history/{redemptionId}
 */
export interface Redemption {
  redemptionId: string;
  userId: string;
  type: RewardType;
  amount: number;
  description: string;
  redeemedAt: Timestamp;
  metadata?: { [key: string]: any };
}

/**
 * Reward policy (global config)
 * Document: /reward_policy/global
 */
export interface RewardPolicy {
  dailyCaps: {
    classPassTotal: number;    // e.g., 100/day globally
    xpTotal: number;            // e.g., 10,000/day globally
  };
  perUserCaps: {
    classPassPerMonth: number;  // e.g., 5/month per user
    xpPerWeek: number;          // e.g., 1,000/week per user
  };
  expirations: {
    classPassDays: number;      // e.g., 90 days
    streakShieldDays: number;   // e.g., 7 days
  };
  abuseLimits: {
    maxRewardsPerDay: number;   // e.g., 10 rewards/day max
  };
}

/**
 * Reward audit log
 * Collection: /rewards_audit_log/{logId}
 */
export interface RewardAuditLog {
  logId: string;
  userId: string;
  action: 'grant' | 'redeem' | 'clawback' | 'expire';
  rewardType: RewardType;
  amount: number;
  loopType?: string;
  timestamp: Timestamp;
  metadata?: { [key: string]: any };
}

/**
 * Request to issue reward
 */
export interface IssueRewardRequest {
  userId?: string;
  loopType: string;
  context?: {
    rating?: number;
    sessionCount?: number;
    subject?: string;
  };
  requestKey?: string; // Optional - will generate if not provided
}

/**
 * Response from issuing reward
 */
export interface IssueRewardResponse {
  success: boolean;
  reward?: RewardConfig;
  rationale: string;
  balances?: Balance;
}

// ============================================================================
// EXPERIMENTATION TYPES (PR17)
// ============================================================================

/**
 * Experiment status
 */
export type ExperimentStatus = 'draft' | 'active' | 'paused' | 'completed';

/**
 * Experiment variant
 */
export interface ExperimentVariant {
  variantId: string;          // e.g., 'control', 'variant_a'
  name: string;               // e.g., 'Original Copy', 'New Copy'
  allocationPct: number;      // 0-100, must sum to 100 across variants
  metadata?: { [key: string]: any };
}

/**
 * Experiment guardrails
 */
export interface ExperimentGuardrails {
  maxSpamRate: number;        // e.g., 0.005 (0.5%)
  maxOptOutRate: number;      // e.g., 0.01 (1%)
  maxCostMultiplier: number;  // e.g., 1.2 (120% of baseline)
}

/**
 * Experiment definition
 * Collection: /experiments/{experimentId}
 */
export interface Experiment {
  experimentId: string;
  name: string;
  description: string;
  loopType: string;           // Which loop this tests
  status: ExperimentStatus;
  
  variants: ExperimentVariant[];
  guardrails: ExperimentGuardrails;
  
  startDate: Timestamp;
  endDate?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
  
  pausedReason?: string;      // If status is 'paused'
}

/**
 * Experiment metrics (computed daily)
 * Collection: /experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}
 */
export interface ExperimentMetrics {
  date: Timestamp;
  experimentId: string;
  variantId: string;
  kFactor: number;
  
  stats: {
    users: number;            // Total users in this variant
    invites: number;          // Total invites sent
    joins: number;            // Total successful joins
    invitesPerUser: number;   // invites / users
    joinsPerInvite: number;   // joins / invites
  };
}

/**
 * Growth event (for experiments)
 * Collection: /experiment_events/{eventId}
 */
export interface GrowthEvent {
  eventId: string;
  eventType: 'loop_exposed' | 'invite_sent' | 'invite_opened' | 'join_completed' | 'fvm_reached';
  userId: string;
  loopType: string;
  experimentId?: string;
  variantId?: string;
  timestamp: Timestamp;
  metadata?: { [key: string]: any };
}

// ============================================================================
// MCP (AGENT COMMUNICATION) TYPES (PR28)
// ============================================================================

/**
 * Agent names in the system
 */
export type AgentName = 'orchestrator' | 'personalization' | 'incentives' | 'fraud' | 'experimentation';

/**
 * Common agent operations
 */
export type OperationType = 
  | 'decide'              // Orchestrator: decide which loop to show
  | 'personalize'         // Personalization: get persona-specific copy
  | 'issue_reward'        // Incentives: grant reward
  | 'check_fraud'         // Fraud: check if user is suspicious
  | 'allocate_variant';   // Experimentation: assign A/B test variant

/**
 * Standard MCP message format
 * All agents communicate using this structure
 */
export interface MCPMessage {
  agentName: AgentName;
  operation: OperationType;
  input: any;              // Agent-specific input
  output: any;             // Agent-specific output
  rationale: string;       // Why this decision was made (≤240 chars)
  featuresUsed: string[];  // Which features influenced decision
  latency: number;         // Time taken in milliseconds
  timestamp: Timestamp;
  userId?: string;
  metadata?: { [key: string]: any };
}

/**
 * Persisted agent log entry
 * Collection: /agent_logs/{userId}/decisions/{logId}
 */
export interface AgentLog {
  logId: string;
  agentName: AgentName;
  operation: OperationType;
  input: any;
  output: any;
  rationale: string;       // PII-redacted, ≤240 chars
  featuresUsed: string[];
  latency: number;
  timestamp: Timestamp;
  loopType?: string;
  experimentId?: string;
  variantId?: string;
}

// ============================================================================
// TUTOR CARD TYPES (PR18)
// ============================================================================

/**
 * Tutor card metadata
 * Collection: /tutor_cards/{tutorId}/cards/{cardId}
 */
export interface TutorCard {
  cardId: string;
  tutorId: string;
  tutorName: string;
  tutorPhoto?: string;

  // Stats shown on card
  rating: number;              // e.g., 5.0
  totalSessions: number;       // e.g., 47
  subjects: string[];          // e.g., ['Math', 'Physics']
  testimonial?: string;        // Optional student quote

  // Attribution
  referralLink: string;
  referralId: string;

  // Metadata
  imageUrl?: string;           // Generated card image
  generatedAt: Timestamp;
  expiresAt: Timestamp;        // Cache for 14 days
  experimentId?: string;
  variantId?: string;

  // Analytics
  viewCount: number;
  shareCount: number;
}

/**
 * Tutor card generation request
 */
export interface GenerateTutorCardRequest {
  tutorId: string;
  forceRegenerate?: boolean;   // Skip cache, create new card
}

/**
 * Tutor card generation response
 */
export interface GenerateTutorCardResponse {
  cardId: string;
  imageUrl: string;            // URL to generated card image
  referralLink: string;
  expiresAt: Timestamp;
  isCached: boolean;           // True if returned from cache
}

// ============================================================================
// CONSENT TYPES (PR19)
// ============================================================================

/**
 * User consent preferences for data sharing
 * Stored in /users/{userId}.consents
 */
export interface UserConsents {
  progressSharing: boolean;      // Allow sharing progress reels
  dataSharing: boolean;          // Allow data for personalization
  grantedAt?: Timestamp;
  updatedAt?: Timestamp;
  revokedAt?: Timestamp | null;
}

/**
 * Consent audit log entry
 * Collection: /consents/{userId}/history/{logId}
 */
export interface ConsentAuditLog {
  userId: string;
  consentType: 'progressSharing' | 'dataSharing';
  action: 'granted' | 'revoked';
  timestamp: Timestamp;
  metadata?: {
    triggeredBy?: 'user' | 'parent' | 'system';
    reason?: string;
  };
}

/**
 * Progress reel data
 * Collection: /reels/{reelId}
 */
export interface ProgressReelData {
  reelId: string;
  userId: string;
  sessionId: string;
  subject?: string;              // Subject of the session
  topics?: string[];             // Topics covered
  highlights: string[];          // PII-redacted
  qualityScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  imageUrls: string[];           // Carousel slides (generated by frontend)
  referralLink: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;          // 30 days retention
  status: 'generating' | 'ready' | 'failed';
}

// ============================================================================
// RESULTS & MICRO-FVM TYPES (PR26)
// ============================================================================

/**
 * Practice/diagnostic result
 * Collection: /practice_results/{resultId}
 */
export interface PracticeResult {
  resultId: string;
  userId: string;
  type: 'diagnostic' | 'practice' | 'skill-check';
  subject: string;
  score: number;              // 0-100
  totalQuestions: number;
  correctAnswers: number;
  skillsBreakdown?: {         // Optional heatmap
    [skill: string]: number;  // e.g., { "algebra": 80, "geometry": 65 }
  };
  recommendations?: string[];
  completedAt: Timestamp;
  sharedAt?: Timestamp;
  shareCount: number;
}

/**
 * Micro-FVM question for quick skill assessment
 */
export interface MicroFVMQuestion {
  questionId: string;
  subject: string;            // 'Math', 'Science', 'English'
  skill: string;              // 'Algebra Basics', 'Photosynthesis', etc.
  text: string;
  options: string[];          // 4 multiple choice options
  correctAnswer: number;      // Index of correct option (0-3)
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Micro-FVM session (5-question quick assessment)
 * Collection: /micro_fvm_sessions/{sessionId}
 */
export interface MicroFVMSession {
  sessionId: string;
  userId?: string;            // null for guest users
  guestId?: string;           // For unauthenticated users
  subject: string;
  questions: MicroFVMQuestion[];
  answers: number[];          // User's selected answers
  score: number;              // 0-100
  completedAt?: Timestamp;
  startedAt: Timestamp;
  referralId?: string;        // Attribution
}

/**
 * Results card metadata
 * Collection: /results_cards/{resultId}
 */
export interface ResultsCard {
  resultId: string;
  userId: string;
  score: number;
  subject: string;
  imageUrl: string;
  referralLink: string;
  referralId: string;
  createdAt: Timestamp;
  viewCount: number;
  shareCount: number;
}

/**
 * Generate results card request
 */
export interface GenerateResultsCardRequest {
  resultId: string;
}

/**
 * Generate results card response
 */
export interface GenerateResultsCardResponse {
  cardId: string;
  imageUrl: string;
  referralLink: string;
}

/**
 * Start micro-FVM request
 */
export interface StartMicroFVMRequest {
  subject: string;
  referralId?: string;
  guestId?: string;
}

/**
 * Start micro-FVM response
 */
export interface StartMicroFVMResponse {
  sessionId: string;
  questions: Array<{
    questionId: string;
    text: string;
    options: string[];
  }>;
}

/**
 * Submit micro-FVM request
 */
export interface SubmitMicroFVMRequest {
  sessionId: string;
  answers: number[];
}

/**
 * Submit micro-FVM response
 */
export interface SubmitMicroFVMResponse {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}

// ============================================================================
// STUDY BUDDY CHALLENGE TYPES (PR23)
// ============================================================================

/**
 * Study Buddy Challenge Question
 */
export interface ChallengeQuestion {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
}

/**
 * Challenge Rewards (earned by both creator and participant)
 */
export interface ChallengeRewards {
  xp: number;
  streakShield: boolean;
}

/**
 * Study Buddy Challenge
 * Collection: /challenges/{challengeId}
 */
export interface Challenge {
  challengeId: string;
  creatorId: string;
  creatorRole?: 'parent' | 'student'; // PR30: Track creator role
  participantId?: string;
  subject: string;
  topic: string;
  questions: ChallengeQuestion[];
  createdAt: Timestamp;
  expiresAt: Timestamp;
  joinedAt?: Timestamp;
  completedAt?: Timestamp;
  status: 'pending' | 'active' | 'completed' | 'expired';
  creatorScore?: number;
  participantScore?: number;
  referralId: string;
  rewards: ChallengeRewards;
  challengeType?: 'student_student' | 'parent_child'; // PR30: Challenge type
  childId?: string; // PR30: For parent challenges, track child
}

/**
 * Challenge completion result
 */
export interface ChallengeResult {
  challengeId: string;
  participantId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  rewards: ChallengeRewards;
  completedAt: Timestamp;
}

/**
 * Request to create a study buddy challenge
 */
export interface CreateChallengeRequest {
  subject: string;
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Request to submit challenge answers
 */
export interface SubmitChallengeRequest {
  challengeId: string;
  answers: string[];
}

// ============================================================================
// PARENT POD & TUTOR PEER TYPES (PR24)
// ============================================================================

/**
 * Parent Pod Invite
 * For inviting other parents to cohort rooms
 */
export interface ParentPodInvite {
  inviteId: string;
  parentId: string;
  cohortId: string;
  cohortName: string;
  referralId: string;
  createdAt: Timestamp;
}

/**
 * Tutor Peer Referral
 * For tutors referring other tutors to the platform
 */
export interface TutorPeerReferral {
  referralId: string;
  referringTutorId: string;
  referringTutorName: string;
  targetEmail?: string;
  complementarySubject: string;
  personalMessage?: string;
  createdAt: Timestamp;
  status: 'pending' | 'clicked' | 'joined';
}

// ============================================================================
// FRAUD DETECTION TYPES (PR22)
// ============================================================================

/**
 * Anomaly Score
 * Fraud risk assessment for users
 */
export interface AnomalyScore {
  userId: string;
  score: number; // 0-100
  signals: {
    velocity: number;
    device: number;
    ip: number;
    behavioral: number;
  };
  reason: string[];
  timestamp: Timestamp;
  autoBlock: boolean; // true if score >= 91
}

/**
 * Fraud Queue Item
 * For admin review of suspicious activity
 */
export interface FraudQueueItem {
  queueId: string;
  referralId: string;
  userId: string;
  anomalyScore: AnomalyScore;
  status: 'pending' | 'approved' | 'rejected' | 'banned';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;
  createdAt: Timestamp;
}

