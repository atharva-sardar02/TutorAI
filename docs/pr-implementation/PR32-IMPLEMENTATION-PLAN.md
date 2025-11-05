# PR32 – Degradation & Feature Kills
**Implementation Plan**

---

## 📋 Overview

**Goal:** Central config for per-loop/agent feature flags, dependency health checks, fallback copy/rewards, safe defaults on LLM/downstream failures  
**Owner:** Engineer A (Backend)  
**Effort:** 3-5 days (Medium)  
**Risk:** High (production safety)  
**Dependencies:** PR16 (orchestrator), PR25 (incentives - for fallback rewards)  
**Kill-Switch:** Master: `growth.enabled`, per-loop flags

---

## ✅ Acceptance Criteria

- [ ] Kill-switch toggles within 60s (verified in staging)
- [ ] All kill-switches tested (master + per-loop + per-agent)
- [ ] No user-visible errors on dependency failure
- [ ] All agents degrade gracefully
- [ ] Fallback copy/rewards tested
- [ ] Circuit breaker auto-recovers after 5 min
- [ ] Health checks run every 60s
- [ ] Alerts sent on unhealthy dependencies

---

## 🗂️ Files to Create/Modify

### **Backend (Functions)**
```
functions/src/
├── utils/
│   ├── healthChecks.ts          [NEW] - Dependency health monitoring
│   ├── circuitBreaker.ts        [NEW] - Circuit breaker pattern
│   └── featureFlags.ts          [NEW] - Server-side flag reader
├── growth/
│   ├── fallbackContent.ts       [NEW] - Fallback copy/rewards
│   └── loopOrchestrator.ts      [MODIFY] - Add health checks
└── config/
    └── features.ts              [MODIFY] - Add kill-switch config
```

### **Frontend (App)**
```
app/src/
├── config/
│   └── featureFlags.ts          [MODIFY] - Add kill-switch config
└── services/growth/
    └── orchestratorService.ts   [MODIFY] - Add fallback handling
```

### **Infrastructure**
```
firestore.rules                  [MODIFY] - Add /feature_flags rules
```

### **Tests**
```
functions/__tests__/
├── healthChecks.test.ts         [NEW] - Health check tests
├── circuitBreaker.test.ts       [NEW] - Circuit breaker tests
└── degradation.test.ts          [NEW] - Integration tests
```

---

## 📐 Step-by-Step Implementation

### **Step 1: Feature Flag Schema (45 min)**

#### 1.1 Update `firestore.rules`
Add after `/loop_exposures` rules:
```javascript
// --- FEATURE_FLAGS COLLECTION (PR32) ---
// Central configuration for kill-switches
match /feature_flags/{flagName} {
  // Anyone can read flags (for client-side checks)
  allow read: if request.auth != null;
  
  // Only admins can write
  allow write: if request.auth != null && 
    request.auth.token.admin == true;
}
```

#### 1.2 Create `/feature_flags` schema in Firestore

Manually create these documents (or via admin script):

**Document: `growth_master`**
```json
{
  "enabled": true,
  "description": "Master kill-switch for all growth features",
  "updatedAt": "2025-11-04T00:00:00Z",
  "updatedBy": "admin@messageai.app"
}
```

**Document: `loop_tutor_card`**
```json
{
  "enabled": true,
  "rolloutPercent": 100,
  "description": "Tutor card viral loop",
  "updatedAt": "2025-11-04T00:00:00Z",
  "updatedBy": "admin@messageai.app"
}
```

**Document: `loop_progress_reel`**
```json
{
  "enabled": false,
  "rolloutPercent": 0,
  "description": "Progress reel viral loop (not yet implemented)",
  "updatedAt": "2025-11-04T00:00:00Z",
  "updatedBy": "admin@messageai.app"
}
```

**Document: `orchestrator`**
```json
{
  "enabled": true,
  "description": "Loop orchestrator decision engine",
  "updatedAt": "2025-11-04T00:00:00Z",
  "updatedBy": "admin@messageai.app"
}
```

**Document: `referral_attribution`**
```json
{
  "enabled": true,
  "description": "Referral link attribution system",
  "updatedAt": "2025-11-04T00:00:00Z",
  "updatedBy": "admin@messageai.app"
}
```

---

### **Step 2: Server-Side Feature Flag Reader (1 hour)**

#### 2.1 Create `functions/src/utils/featureFlags.ts`
```typescript
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
```

---

### **Step 3: Health Checks & Circuit Breaker (1.5 hours)**

#### 3.1 Create `functions/src/utils/circuitBreaker.ts`
```typescript
import * as logger from 'firebase-functions/logger';

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening (default: 3)
  recoveryTimeout: number;     // Time to wait before testing (default: 5 min)
  successThreshold: number;    // Successes before closing (default: 2)
}

/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascading failures by:
 * 1. Opening circuit after N consecutive failures
 * 2. Automatically testing recovery after timeout
 * 3. Closing circuit after successful recovery
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;
  
  constructor(
    private name: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.config = {
      failureThreshold: config?.failureThreshold || 3,
      recoveryTimeout: config?.recoveryTimeout || 5 * 60 * 1000, // 5 min
      successThreshold: config?.successThreshold || 2,
    };
  }
  
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if recovery timeout has passed
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.config.recoveryTimeout) {
        logger.info(`Circuit breaker ${this.name}: Testing recovery (HALF_OPEN)`);
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Record successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        logger.info(`Circuit breaker ${this.name}: Recovered (CLOSED)`);
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }
  
  /**
   * Record failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      logger.error(`Circuit breaker ${this.name}: Too many failures (OPEN)`, {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
      });
      this.state = CircuitState.OPEN;
    }
  }
  
  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }
  
  /**
   * Get current state
   */
  getState(): string {
    return this.state;
  }
  
  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    logger.info(`Circuit breaker ${this.name}: Reset to CLOSED`);
  }
}
```

#### 3.2 Create `functions/src/utils/healthChecks.ts`
```typescript
import * as logger from 'firebase-functions/logger';
import { CircuitBreaker } from './circuitBreaker';

// Circuit breakers for each dependency
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create circuit breaker for dependency
 */
function getCircuitBreaker(name: string): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name));
  }
  return circuitBreakers.get(name)!;
}

/**
 * Check health of OpenAI API
 */
export async function checkOpenAIHealth(): Promise<boolean> {
  const breaker = getCircuitBreaker('openai');
  
  if (breaker.isOpen()) {
    logger.warn('OpenAI circuit breaker is OPEN');
    return false;
  }
  
  try {
    // Simple health check: Just verify API key exists
    // In production: Make lightweight API call
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // TODO: Add actual API health check
    // const response = await fetch('https://api.openai.com/v1/models', {
    //   headers: { Authorization: `Bearer ${apiKey}` }
    // });
    
    return true;
  } catch (error: any) {
    logger.error('OpenAI health check failed', { error: error.message });
    return false;
  }
}

/**
 * Check health of Cloudinary (image/video generation)
 */
export async function checkCloudinaryHealth(): Promise<boolean> {
  const breaker = getCircuitBreaker('cloudinary');
  
  if (breaker.isOpen()) {
    logger.warn('Cloudinary circuit breaker is OPEN');
    return false;
  }
  
  try {
    // Check if credentials exist
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    
    if (!cloudName || !apiKey) {
      throw new Error('Cloudinary credentials not configured');
    }
    
    return true;
  } catch (error: any) {
    logger.error('Cloudinary health check failed', { error: error.message });
    return false;
  }
}

/**
 * Check health of Firestore
 */
export async function checkFirestoreHealth(): Promise<boolean> {
  const breaker = getCircuitBreaker('firestore');
  
  if (breaker.isOpen()) {
    logger.warn('Firestore circuit breaker is OPEN');
    return false;
  }
  
  try {
    await breaker.execute(async () => {
      const admin = await import('firebase-admin');
      const db = admin.firestore();
      // Simple read operation
      await db.collection('feature_flags').doc('growth_master').get();
    });
    
    return true;
  } catch (error: any) {
    logger.error('Firestore health check failed', { error: error.message });
    return false;
  }
}

/**
 * Run all health checks
 */
export async function runHealthChecks(): Promise<{
  healthy: boolean;
  checks: Record<string, boolean>;
}> {
  const checks = {
    openai: await checkOpenAIHealth(),
    cloudinary: await checkCloudinaryHealth(),
    firestore: await checkFirestoreHealth(),
  };
  
  const healthy = Object.values(checks).every(check => check);
  
  if (!healthy) {
    logger.warn('Health checks failed', checks);
  }
  
  return { healthy, checks };
}

/**
 * Get circuit breaker states (for monitoring)
 */
export function getCircuitBreakerStates(): Record<string, string> {
  const states: Record<string, string> = {};
  
  circuitBreakers.forEach((breaker, name) => {
    states[name] = breaker.getState();
  });
  
  return states;
}
```

---

### **Step 4: Fallback Content (1 hour)**

#### 4.1 Create `functions/src/growth/fallbackContent.ts`
```typescript
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
  return FALLBACK_REWARDS[loopType] || FALLBACK_REWARDS.default;
}
```

---

### **Step 5: Integrate Health Checks into Orchestrator (30 min)**

#### 5.1 Update `functions/src/growth/loopOrchestrator.ts`

Add at the top:
```typescript
import { isGrowthFeatureEnabled } from '../utils/featureFlags';
import { checkFirestoreHealth } from '../utils/healthChecks';
import { getFallbackCopy } from './fallbackContent';
```

Modify `getOrchestratorDecision`:
```typescript
// Step 1: Check master feature flag (from Firestore)
const masterEnabled = await isGrowthFeatureEnabled('orchestrator');
if (!masterEnabled) {
  return createThrottledDecision('Orchestrator disabled via kill-switch', userRole);
}

// Step 2: Health check
const firestoreHealthy = await checkFirestoreHealth();
if (!firestoreHealthy) {
  logger.error('Firestore unhealthy, using fallback');
  return createThrottledDecision('Service temporarily unavailable', userRole);
}
```

---

### **Step 6: Testing & Deployment (2 hours)**

#### 6.1 Create `functions/__tests__/healthChecks.test.ts`
```typescript
import { checkOpenAIHealth, checkFirestoreHealth } from '../src/utils/healthChecks';
import { CircuitBreaker } from '../src/utils/circuitBreaker';

describe('Health Checks', () => {
  it('checks OpenAI health', async () => {
    const healthy = await checkOpenAIHealth();
    expect(typeof healthy).toBe('boolean');
  });
  
  it('checks Firestore health', async () => {
    const healthy = await checkFirestoreHealth();
    expect(typeof healthy).toBe('boolean');
  });
});

describe('Circuit Breaker', () => {
  it('opens after threshold failures', async () => {
    const breaker = new CircuitBreaker('test', { failureThreshold: 3 });
    
    const failingFn = async () => {
      throw new Error('Test failure');
    };
    
    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(failingFn);
      } catch (e) {
        // Expected
      }
    }
    
    expect(breaker.isOpen()).toBe(true);
  });
  
  it('recovers after timeout', async () => {
    const breaker = new CircuitBreaker('test', {
      failureThreshold: 2,
      recoveryTimeout: 100, // 100ms for testing
    });
    
    // Open circuit
    const failingFn = async () => { throw new Error('Test'); };
    for (let i = 0; i < 2; i++) {
      try { await breaker.execute(failingFn); } catch (e) {}
    }
    
    expect(breaker.isOpen()).toBe(true);
    
    // Wait for recovery timeout
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should allow test
    const successFn = async () => 'success';
    await breaker.execute(successFn);
    await breaker.execute(successFn);
    
    expect(breaker.isOpen()).toBe(false);
  });
});
```

---

## 🚀 Deployment Steps

### **Step 1: Create Feature Flags in Firestore**
Manually or via script, create `/feature_flags` collection with initial documents.

### **Step 2: Deploy Firestore Rules**
```bash
firebase deploy --only firestore:rules
```

### **Step 3: Build & Deploy Functions**
```bash
cd functions && pnpm run build && cd ..
firebase deploy --only functions
```

### **Step 4: Test Kill-Switches**

**Test in Firebase Console:**
1. Set `growth_master.enabled = false`
2. Try to get orchestrator decision → should be throttled
3. Set `growth_master.enabled = true`
4. Verify it works again

**Measure:** Time from toggle to effect (target: <60s)

---

## ✅ Definition of Done

- [ ] Feature flags stored in Firestore
- [ ] Server-side flag reader with 60s cache
- [ ] Circuit breakers for all dependencies
- [ ] Health checks implemented
- [ ] Fallback copy/rewards defined
- [ ] Orchestrator uses health checks
- [ ] Kill-switches tested (master + per-loop)
- [ ] Circuit breaker tested (open → recover)
- [ ] Tests pass (80% coverage)
- [ ] Manual testing complete

---

**Estimated Time:** 8-10 hours (1-2 days)  
**Next PR:** PR18 (Tutor Cards) - First viral loop with full safety!

