import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getEligibilityRules, getConfiguredLoops } from './eligibilityRules';
import { isGrowthFeatureEnabled } from '../utils/featureFlags';
import { checkFirestoreHealth } from '../utils/healthChecks';
import { logAgentCall } from '../utils/agentLogger';
import { getUserVariant, logGrowthEvent } from './experimentService';

const getDb = () => admin.firestore();

/**
 * Cloud Function: Get orchestrator decision
 * 
 * Called by: Mobile app before showing any viral prompt
 * 
 * Decision Flow:
 * 1. Check feature flags (master + per-loop)
 * 2. Check user eligibility (role, sessions, rating)
 * 3. Check cooldowns (no duplicate prompts)
 * 4. Allocate experiment variant
 * 5. Return decision with rationale
 * 
 * Performance: P95 <150ms
 */
export const getOrchestratorDecision = onCall(
  {
    timeoutSeconds: 10,
    memory: '256MiB',
  },
  async (request) => {
    const startTime = Date.now();
    const { auth, data } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const {
      userRole,
      sessionContext,
      requestedLoops,
    } = data;
    
    const userId = auth.uid;
    
    try {
      // Step 0: Check master feature flag (from Firestore)
      const masterEnabled = await isGrowthFeatureEnabled('orchestrator');
      if (!masterEnabled) {
        logger.info('⏭️ Orchestrator disabled via kill-switch', { userId: userId.substring(0, 8) });
        return createThrottledDecision('Orchestrator disabled via kill-switch', userRole);
      }

      // Step 0.5: Health check
      const firestoreHealthy = await checkFirestoreHealth();
      if (!firestoreHealthy) {
        logger.error('⚠️ Firestore unhealthy, using fallback', { userId: userId.substring(0, 8) });
        return createThrottledDecision('Service temporarily unavailable', userRole);
      }
      
      // Wrap entire orchestrator logic with agent logger
      const decision = await logAgentCall(
        'orchestrator',
        'decide',
        { userRole, sessionContext, requestedLoops },
        async () => {
          // Step 1: Get user data
          const db = getDb();
          const userDoc = await db.doc(`users/${userId}`).get();
          const userData = userDoc.data();
          
          if (!userData) {
            return createThrottledDecision('User not found', userRole);
          }
          
          // Extract user locale (PR17.5 - Personalization)
          const userLocale = userData.locale || 'en';
          
          // Step 2: Determine eligible loops
          const eligibleLoops = await getEligibleLoops(
            userId,
            userRole,
            userData,
            sessionContext,
            requestedLoops
          );
          
          if (eligibleLoops.length === 0) {
            const rationale = requestedLoops
              ? `None of requested loops eligible: ${requestedLoops.join(', ')}`
              : 'No eligible loops at this time';
            
            return createThrottledDecision(rationale, userRole);
          }
          
          // Step 3: Check cooldowns
          const uncooledLoops = await filterByCooldown(userId, eligibleLoops);
          
          if (uncooledLoops.length === 0) {
            return createThrottledDecision(
              'All eligible loops on cooldown',
              userRole
            );
          }
          
          // Step 4: Select loop (prioritize by weight/context)
          const selectedLoop = selectLoop(uncooledLoops, sessionContext);
          
          // Step 5: Allocate experiment variant
          const variantAllocation = await getUserVariant(userId, selectedLoop);
          const experimentId = variantAllocation?.experimentId || 'default';
          const variantId = variantAllocation?.variantId || 'control';
          
          // Step 6: Set cooldown
          await setCooldown(userId, selectedLoop);
          
          // Step 7: Build decision
          const result = {
            shouldShow: true,
            loopType: selectedLoop,
            persona: userRole,
            locale: userLocale,  // PR17.5: Include user locale for personalization
            copyKey: `${selectedLoop}.${userRole}`,
            cooldownMs: getEligibilityRules(selectedLoop)!.cooldownMs,
            experimentId,
            variantId,
            rationale: `Eligible: ${selectedLoop}, variant: ${variantId}`,
            decidedAt: Date.now(),
          };
          
          // Step 8: Log exposure (old format)
          await logExposure(userId, result, sessionContext, userRole);
          
          // Step 9: Log growth event (new format for experiments)
          await logGrowthEvent('loop_exposed', userId, selectedLoop, experimentId, variantId, {
            userRole,
            sessionContext,
          });
          
          return result;
        },
        userId,
        ['role', 'sessions', 'rating', 'cooldown'],
        { loopType: requestedLoops?.[0] }
      );
      
      const latency = Date.now() - startTime;
      logger.info('✅ Orchestrator decision', {
        userId: userId.substring(0, 8),
        loopType: decision.loopType,
        shouldShow: decision.shouldShow,
        latency,
      });
      
      return decision;
      
    } catch (error: any) {
      const latency = Date.now() - startTime;
      logger.error('❌ Orchestrator failed', {
        error: error.message,
        userId: userId.substring(0, 8),
        latency,
      });
      
      // Graceful fallback: return throttled decision
      return createThrottledDecision('Internal error', userRole);
    }
  }
);

/**
 * Helper: Create a "throttled" decision (don't show prompt)
 */
function createThrottledDecision(
  rationale: string,
  persona: string
): any {
  return {
    shouldShow: false,
    persona,
    rationale: rationale.substring(0, 240), // Truncate to 240 chars
    decidedAt: Date.now(),
  };
}

/**
 * Get eligible loops for user based on rules
 */
async function getEligibleLoops(
  userId: string,
  userRole: string,
  userData: any,
  sessionContext: any,
  requestedLoops?: string[]
): Promise<string[]> {
  const loopsToCheck = requestedLoops || getConfiguredLoops();
  const eligible: string[] = [];
  
  for (const loopType of loopsToCheck) {
    const rules = getEligibilityRules(loopType);
    if (!rules) continue;
    
    // Check role requirement
    if (rules.requiredRole && rules.requiredRole !== userRole) {
      logger.debug(`Loop ${loopType} requires role ${rules.requiredRole}, user is ${userRole}`);
      continue;
    }
    
    // Check min sessions
    if (rules.minSessions) {
      const sessionCount = sessionContext?.sessionCount || 0;
      if (sessionCount < rules.minSessions) {
        logger.debug(`Loop ${loopType} requires ${rules.minSessions} sessions, user has ${sessionCount}`);
        continue;
      }
    }
    
    // Check min rating
    if (rules.minRating) {
      const rating = sessionContext?.rating || 0;
      if (rating < rules.minRating) {
        logger.debug(`Loop ${loopType} requires rating ${rules.minRating}, user has ${rating}`);
        continue;
      }
    }
    
    // Check max exposures per day
    if (rules.maxExposuresPerDay) {
      const todayCount = await getTodayExposureCount(userId, loopType);
      if (todayCount >= rules.maxExposuresPerDay) {
        logger.debug(`Loop ${loopType} max ${rules.maxExposuresPerDay} per day, already at ${todayCount}`);
        continue;
      }
    }
    
    eligible.push(loopType);
  }
  
  logger.info(`Eligible loops for user ${userId.substring(0, 8)}:`, eligible);
  return eligible;
}

/**
 * Filter loops by cooldown status
 */
async function filterByCooldown(
  userId: string,
  loops: string[]
): Promise<string[]> {
  const db = getDb();
  const uncooled: string[] = [];
  
  for (const loopType of loops) {
    const cooldownRef = db
      .collection('cooldowns')
      .doc(userId)
      .collection('loops')
      .doc(loopType);
    
    const cooldownDoc = await cooldownRef.get();
    
    if (!cooldownDoc.exists) {
      // No cooldown exists yet, user is eligible
      uncooled.push(loopType);
      continue;
    }
    
    const cooldown = cooldownDoc.data();
    const now = Date.now();
    const expiresAt = cooldown?.expiresAt?.toMillis() || 0;
    
    if (now >= expiresAt) {
      // Cooldown expired, user is eligible
      uncooled.push(loopType);
    } else {
      // Still on cooldown
      const remainingMs = expiresAt - now;
      const remainingHours = Math.round(remainingMs / (1000 * 60 * 60));
      logger.debug(`Loop ${loopType} on cooldown for ${remainingHours}h`);
    }
  }
  
  logger.info(`Uncooled loops for user ${userId.substring(0, 8)}:`, uncooled);
  return uncooled;
}

/**
 * Select which loop to show (priority/context-based)
 * 
 * For MVP: Simple first-match selection
 * Future: Weighted selection based on:
 * - K-factor per loop (prioritize high-performing loops)
 * - Context (e.g., after 5★ session → tutor_card)
 * - Recency (show loops not seen recently)
 */
function selectLoop(
  eligibleLoops: string[],
  sessionContext: any
): string {
  // Context-based prioritization (future enhancement)
  // For now: Return first eligible loop
  return eligibleLoops[0];
}

// allocateExperiment moved to experimentService.ts (getUserVariant)

/**
 * Set cooldown for loop
 * 
 * Prevents duplicate prompts within cooldown period
 * Uses atomic increment for exposure count
 */
async function setCooldown(
  userId: string,
  loopType: string
): Promise<void> {
  const rules = getEligibilityRules(loopType);
  if (!rules) return;
  
  const db = getDb();
  const cooldownRef = db
    .collection('cooldowns')
    .doc(userId)
    .collection('loops')
    .doc(loopType);
  
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + rules.cooldownMs
  );
  
  await cooldownRef.set({
    userId,
    loopType,
    lastShownAt: now,
    expiresAt,
    exposureCount: admin.firestore.FieldValue.increment(1),
  }, { merge: true });
  
  logger.info(`✅ Cooldown set for ${loopType}`, {
    userId: userId.substring(0, 8),
    expiresAt: expiresAt.toDate().toISOString(),
  });
}

/**
 * Log exposure for analytics
 * 
 * Every decision (show or throttle) is logged for:
 * - A/B testing analysis (PR17)
 * - Funnel analytics (exposure → action → conversion)
 * - Debugging (why was user shown/not shown a prompt?)
 */
async function logExposure(
  userId: string,
  decision: any,
  sessionContext: any,
  userRole: string
): Promise<void> {
  const db = getDb();
  
  try {
    await db.collection('loop_exposures').add({
      userId,
      loopType: decision.loopType || 'none',
      decision,
      context: {
        userRole,
        sessionContext,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.info(`✅ Exposure logged`, {
      userId: userId.substring(0, 8),
      loopType: decision.loopType,
      shouldShow: decision.shouldShow,
    });
  } catch (error: any) {
    // Don't fail the request if logging fails
    logger.warn('⚠️ Failed to log exposure', {
      error: error.message,
      userId: userId.substring(0, 8),
    });
  }
}

/**
 * Get today's exposure count for loop
 * 
 * Used to enforce maxExposuresPerDay limit
 */
async function getTodayExposureCount(
  userId: string,
  loopType: string
): Promise<number> {
  const db = getDb();
  
  // Start of today (00:00:00)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  try {
    const snapshot = await db
      .collection('loop_exposures')
      .where('userId', '==', userId)
      .where('loopType', '==', loopType)
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
      .count()
      .get();
    
    return snapshot.data().count;
  } catch (error: any) {
    // If count fails, assume 0 (optimistic)
    logger.warn('⚠️ Failed to count today exposures', {
      error: error.message,
      userId: userId.substring(0, 8),
      loopType,
    });
    return 0;
  }
}

