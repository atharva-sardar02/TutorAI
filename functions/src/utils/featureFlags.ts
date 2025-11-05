import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const getDb = () => admin.firestore();

// In-memory cache (60s TTL)
const flagCache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Check if a feature flag is enabled
 * 
 * Uses in-memory cache (60s) to avoid Firestore reads on every request
 * Cache invalidation: Auto-expires after 60s
 * 
 * @param flagName - Name of the flag (e.g., "growth_master", "loop_tutor_card")
 * @returns true if enabled, false if disabled
 */
export async function isFeatureFlagEnabled(flagName: string): Promise<boolean> {
  // Check cache first
  const cached = flagCache.get(flagName);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }
  
  // Fetch from Firestore
  try {
    const db = getDb();
    const flagDoc = await db.collection('feature_flags').doc(flagName).get();
    
    if (!flagDoc.exists) {
      logger.warn(`Feature flag not found: ${flagName}, defaulting to false`);
      // Cache the result (false)
      flagCache.set(flagName, {
        value: false,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return false;
    }
    
    const flagData = flagDoc.data();
    const enabled = flagData?.enabled === true;
    
    // Cache the result
    flagCache.set(flagName, {
      value: enabled,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    
    return enabled;
  } catch (error: any) {
    logger.error(`Failed to fetch feature flag: ${flagName}`, {
      error: error.message,
    });
    
    // Fail open: If we can't read flags, assume enabled
    // This prevents feature flag failures from breaking the app
    return true;
  }
}

/**
 * Check if growth features are enabled
 * 
 * Checks master kill-switch first, then specific feature
 */
export async function isGrowthFeatureEnabled(featureName: string): Promise<boolean> {
  // Check master kill-switch
  const masterEnabled = await isFeatureFlagEnabled('growth_master');
  if (!masterEnabled) {
    return false;
  }
  
  // Check specific feature
  return isFeatureFlagEnabled(featureName);
}

/**
 * Check if a specific viral loop is enabled
 * Checks master kill-switch + loop-specific flag
 * 
 * @param loopType - Loop type (e.g., 'tutorCard', 'studyBuddy', 'progressReel')
 */
export async function isLoopEnabled(loopType: string): Promise<boolean> {
  // Check master kill-switch
  const masterEnabled = await isFeatureFlagEnabled('growth_master');
  if (!masterEnabled) {
    return false;
  }
  
  // Check loop-specific flag
  const loopFlagName = `loop_${loopType}`;
  return isFeatureFlagEnabled(loopFlagName);
}

/**
 * Check rollout percentage for gradual rollout
 * 
 * @param flagName - Name of the flag
 * @param userId - User ID for consistent hashing
 * @returns true if user is in rollout percentage
 */
export async function isInRollout(flagName: string, userId: string): Promise<boolean> {
  try {
    const db = getDb();
    const flagDoc = await db.collection('feature_flags').doc(flagName).get();
    
    if (!flagDoc.exists) return false;
    
    const flagData = flagDoc.data();
    const rolloutPercent = flagData?.rolloutPercent || 0;
    
    if (rolloutPercent === 0) return false;
    if (rolloutPercent === 100) return true;
    
    // Consistent hashing: userId → percentage bucket
    const hash = simpleHash(userId);
    const bucket = hash % 100;
    
    return bucket < rolloutPercent;
  } catch (error: any) {
    logger.error(`Failed to check rollout: ${flagName}`, {
      error: error.message,
    });
    return true; // Fail open
  }
}

/**
 * Simple hash function for consistent bucketing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Clear cache (for testing or manual refresh)
 */
export function clearFlagCache(): void {
  flagCache.clear();
  logger.info('Feature flag cache cleared');
}

