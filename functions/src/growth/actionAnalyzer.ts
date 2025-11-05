/**
 * Action Analyzer
 * PR20: Transcription & Agentic Actions
 * 
 * Analyzes session summaries and identifies viral action opportunities
 * Returns prioritized list of actions to execute
 */

import * as logger from 'firebase-functions/logger';
import { SessionSummary } from '../ai/sessionSummarizer';
import { isGrowthFeatureEnabled, isLoopEnabled } from '../utils/featureFlags';

export type ActionType = 
  | 'tutorCard'      // PR18 - Shareable tutor testimonial
  | 'progressReel'   // PR19 - Video highlights (requires consent)
  | 'studyBuddy'     // PR23 - Challenge a friend
  | 'prepPack'       // PR20 - Email study materials
  | 'parentPod';     // PR24 - Group invite

export interface ActionOpportunity {
  type: ActionType;
  priority: number; // 1-10 (10 = highest)
  reason: string;
  metadata: Record<string, any>;
}

/**
 * Analyze session summary and identify viral action opportunities
 * 
 * @param sessionId - Session ID
 * @param summary - AI-generated session summary
 * @param sessionData - Additional session metadata
 * @returns Array of action opportunities, sorted by priority
 */
export async function analyzeActions(
  sessionId: string,
  summary: SessionSummary,
  sessionData: any
): Promise<ActionOpportunity[]> {
  
  const opportunities: ActionOpportunity[] = [];
  
  logger.info('🔍 Analyzing action opportunities', {
    sessionId,
    qualityScore: summary.qualityScore,
    viralSignals: summary.viralSignals,
    sentiment: summary.sentiment,
  });
  
  // 1. TutorCard: High-quality session with positive feedback
  if (
    await isGrowthFeatureEnabled('tutorCard') &&
    summary.qualityScore >= 80 &&
    summary.viralSignals.hasPositiveFeedback &&
    summary.sentiment === 'positive'
  ) {
    opportunities.push({
      type: 'tutorCard',
      priority: 9,
      reason: 'High-quality session with 5★ feedback',
      metadata: {
        rating: sessionData.rating || 5,
        highlights: summary.highlights.slice(0, 2),
        topics: summary.topics,
        qualityScore: summary.qualityScore,
      },
    });
  }
  
  // 2. ProgressReel: Big win or breakthrough moment
  if (
    await isGrowthFeatureEnabled('progressReel') &&
    (summary.viralSignals.hasBigWin || summary.viralSignals.hasProgress) &&
    summary.qualityScore >= 70
  ) {
    opportunities.push({
      type: 'progressReel',
      priority: 8,
      reason: 'Student showed breakthrough or significant progress',
      metadata: {
        hasConsent: sessionData.videoConsent || false, // Check consent
        highlights: summary.highlights,
        progress: summary.studentProgress.improvements,
        hasBigWin: summary.viralSignals.hasBigWin,
      },
    });
  }
  
  // 3. StudyBuddy: Good practice session (PR23)
  // Trigger when student scores ≥70% and cooldown elapsed
  const studyBuddyEnabled = await isLoopEnabled('studyBuddy');
  if (
    studyBuddyEnabled &&
    sessionData.userRole === 'student' &&
    summary.qualityScore >= 70 &&
    summary.topics.length > 0
  ) {
    opportunities.push({
      type: 'studyBuddy',
      priority: 7,
      reason: `Student scored ${summary.qualityScore}% - eligible for peer challenge`,
      metadata: {
        subject: sessionData.subject || summary.topics[0],
        topic: summary.topics[0] || 'General Practice',
        difficulty: summary.qualityScore >= 90 ? 'hard' : summary.qualityScore >= 80 ? 'medium' : 'easy',
        score: summary.qualityScore,
      },
    });
  }
  
  // 4. PrepPack: ALWAYS generate (universal value)
  if (await isGrowthFeatureEnabled('prepPack')) {
    opportunities.push({
      type: 'prepPack',
      priority: 6, // Lower priority but always run
      reason: 'Universal: Generate study materials for next session',
      metadata: {
        topics: summary.topics,
        nextSteps: summary.studentProgress.nextSteps,
        highlights: summary.highlights,
      },
    });
  }
  
  // 5. ParentPod: First session or milestone achieved
  if (
    await isGrowthFeatureEnabled('parentPod') &&
    (sessionData.sessionCount === 1 || summary.qualityScore >= 90)
  ) {
    opportunities.push({
      type: 'parentPod',
      priority: 5,
      reason: sessionData.sessionCount === 1 
        ? 'First session - invite other parents'
        : 'Milestone achieved - share success',
      metadata: {
        isFirstSession: sessionData.sessionCount === 1,
        highlights: summary.highlights,
        qualityScore: summary.qualityScore,
      },
    });
  }
  
  // Sort by priority (highest first)
  opportunities.sort((a, b) => b.priority - a.priority);
  
  logger.info('✅ Action analysis complete', {
    sessionId,
    opportunityCount: opportunities.length,
    actions: opportunities.map(o => ({ type: o.type, priority: o.priority })),
  });
  
  return opportunities;
}

