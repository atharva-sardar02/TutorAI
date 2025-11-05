import { getFunctions, httpsCallable } from 'firebase/functions';
import type { OrchestratorRequest, OrchestratorDecision } from '@/types/growthTypes';
import { GROWTH_FEATURE_FLAGS } from '@/config/featureFlags';

const functions = getFunctions();

/**
 * Get orchestrator decision before showing viral prompt
 * 
 * This is the **gate** for all viral prompts - always call before showing:
 * - Tutor cards
 * - Progress reels
 * - Study buddy challenges
 * - Parent pod invites
 * - etc.
 * 
 * The orchestrator:
 * - Checks eligibility (role, sessions, rating)
 * - Enforces cooldowns (no spam)
 * - Allocates experiment variants (A/B testing)
 * - Logs all decisions (analytics)
 * 
 * Usage Example:
 * ```typescript
 * const decision = await getOrchestratorDecision({
 *   userRole: 'tutor',
 *   sessionContext: {
 *     rating: 5.0,
 *     sessionCount: 10,
 *     conversationId: 'conv_123'
 *   }
 * });
 * 
 * if (decision.shouldShow) {
 *   // Show prompt for decision.loopType
 *   showViralPrompt(decision.loopType, decision.copyKey);
 * } else {
 *   // Don't show prompt
 *   console.log('Throttled:', decision.rationale);
 * }
 * ```
 * 
 * @param request - Orchestrator request with user context
 * @returns Decision with rationale
 */
export async function getOrchestratorDecision(
  request: Omit<OrchestratorRequest, 'userId'>
): Promise<OrchestratorDecision> {
  // Check master feature flag
  if (!GROWTH_FEATURE_FLAGS.enabled || !GROWTH_FEATURE_FLAGS.orchestrator.enabled) {
    console.log('ℹ️ Orchestrator disabled via feature flag');
    return {
      shouldShow: false,
      persona: request.userRole,
      rationale: 'Orchestrator disabled',
      decidedAt: Date.now(),
    };
  }
  
  try {
    const startTime = Date.now();
    
    const decisionFn = httpsCallable<
      Omit<OrchestratorRequest, 'userId'>,
      OrchestratorDecision
    >(
      functions,
      'getOrchestratorDecision'
    );
    
    const result = await decisionFn(request);
    const decision = result.data;
    
    const latency = Date.now() - startTime;
    
    console.log('🎯 Orchestrator decision:', {
      shouldShow: decision.shouldShow,
      loopType: decision.loopType,
      rationale: decision.rationale,
      latency: `${latency}ms`,
    });
    
    // Performance warning
    if (latency > 150) {
      console.warn('⚠️ Orchestrator slow:', {
        latency: `${latency}ms`,
        target: '150ms',
      });
    }
    
    return decision;
  } catch (error: any) {
    console.error('❌ Orchestrator failed:', error.message);
    
    // Graceful fallback: don't show prompt
    // This ensures viral loops never block the user experience
    return {
      shouldShow: false,
      persona: request.userRole,
      rationale: `Service error: ${error.message}`,
      decidedAt: Date.now(),
    };
  }
}

/**
 * Request decision for specific loops only
 * 
 * Use this when you know which loop(s) you want to show
 * and want to check if they're eligible
 * 
 * Example:
 * ```typescript
 * // After a 5-star session, check if tutor_card is eligible
 * const decision = await requestSpecificLoops(
 *   ['tutor_card'],
 *   'tutor',
 *   { rating: 5.0, sessionCount: 10 }
 * );
 * ```
 */
export async function requestSpecificLoops(
  loops: string[],
  userRole: 'tutor' | 'parent' | 'student',
  sessionContext?: any
): Promise<OrchestratorDecision> {
  return getOrchestratorDecision({
    userRole,
    sessionContext,
    requestedLoops: loops,
  });
}

/**
 * Check if user can see any viral prompt right now
 * 
 * Lightweight check - doesn't set cooldowns or log exposures
 * Use for UI state (e.g., show/hide "Share" button)
 * 
 * Note: This is a best-effort check. The actual decision
 * happens when you call getOrchestratorDecision().
 */
export async function canShowAnyPrompt(
  userRole: 'tutor' | 'parent' | 'student',
  sessionContext?: any
): Promise<boolean> {
  try {
    const decision = await getOrchestratorDecision({
      userRole,
      sessionContext,
    });
    return decision.shouldShow;
  } catch (error) {
    // Fail open: allow UI to show (actual gate is in getOrchestratorDecision)
    return true;
  }
}

/**
 * Get user's cooldown status for debugging
 * 
 * Shows which loops are on cooldown and when they expire
 * Useful for settings/debug screens
 */
export async function getCooldownStatus(
  userId: string
): Promise<Array<{ loopType: string; expiresAt: Date; hoursRemaining: number }>> {
  // TODO: Implement admin endpoint to query cooldowns
  // For now, return empty array
  return [];
}

