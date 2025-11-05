# PR16 – Loop Orchestrator
**Implementation Plan**

---

## 📋 Overview

**Goal:** 150ms decision engine that determines when/how to show viral prompts with eligibility checks, cooldowns, and experiment allocation  
**Owner:** Engineer A (Backend)  
**Effort:** 3-5 days (Medium)  
**Dependencies:** PR15 (referral types)  
**Kill-Switch:** `growth.orchestrator.enabled` + per-loop flags

---

## ✅ Acceptance Criteria

- [ ] Decision made in <150ms (P95)
- [ ] Zero duplicate prompts within cooldown period
- [ ] Eligibility rules enforced 100%
- [ ] Kill-switch toggles within <1 min
- [ ] Rationale logged for every decision (≤240 chars)
- [ ] 100% of decisions logged to `/loop_exposures`
- [ ] Graceful fallback on timeout (>500ms)

---

## 🗂️ Files to Create/Modify

### **Backend (Functions)**
```
functions/src/
├── growth/
│   ├── loopOrchestrator.ts       [NEW] - Decision engine
│   └── orchestratorTypes.ts      [NEW] - Backend types
└── index.ts                       [MODIFY] - Export orchestrator
```

### **Frontend (App)**
```
app/src/
├── types/
│   └── growthTypes.ts             [MODIFY] - Add orchestrator types
├── services/growth/
│   └── orchestratorService.ts     [NEW] - Client service
└── config/
    └── featureFlags.ts            [MODIFY] - Add orchestrator flag
```

### **Infrastructure**
```
firestore.rules                    [MODIFY] - Add /cooldowns, /loop_exposures rules
firestore.indexes.json             [MODIFY] - Add orchestrator indexes
```

### **Tests**
```
functions/__tests__/
└── loopOrchestrator.test.ts       [NEW] - Unit tests
```

---

## 📐 Step-by-Step Implementation

### **Step 1: Types & Schema (30 min)**

#### 1.1 Update `app/src/types/growthTypes.ts`
Add these interfaces:
```typescript
/**
 * Orchestrator decision request
 */
export interface OrchestratorRequest {
  userId: string;
  userRole: 'tutor' | 'parent' | 'student';
  sessionContext?: {
    conversationId?: string;
    recentActivity?: string;
    sessionCount?: number;
    rating?: number;
  };
  requestedLoops?: string[]; // Optional: specific loops to check
}

/**
 * Orchestrator decision response
 */
export interface OrchestratorDecision {
  shouldShow: boolean;
  loopType?: string;
  persona: 'tutor' | 'parent' | 'student';
  copyKey?: string;
  cooldownMs?: number;
  experimentId?: string;
  variantId?: string;
  rationale: string; // Why this decision was made (≤240 chars)
  decidedAt: number; // Unix timestamp
}

/**
 * Cooldown tracking
 * Collection: /cooldowns/{userId}/{loopType}
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
 * Collection: /loop_exposures/{userId}/{timestamp}
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
```

#### 1.2 Update `firestore.indexes.json`
Add orchestrator indexes:
```json
{
  "collectionGroup": "cooldowns",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "expiresAt", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "loop_exposures",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "loop_exposures",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "loopType", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
}
```

#### 1.3 Update `firestore.rules`
Add after `/referrals` rules:
```javascript
// --- COOLDOWNS COLLECTION (PR16) ---
// Track when users were last shown viral prompts
match /cooldowns/{userId}/{loopType} {
  // Users can read their own cooldowns
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Only Cloud Functions can write
  allow write: if false;
}

// --- LOOP_EXPOSURES COLLECTION (PR16) ---
// Log all orchestrator decisions for analytics
match /loop_exposures/{exposureId} {
  // Users can read their own exposure history (for debugging)
  allow read: if request.auth != null && 
    request.auth.uid == resource.data.userId;
  
  // Only Cloud Functions can write
  allow write: if false;
}
```

---

### **Step 2: Eligibility Rules Config (30 min)**

#### 2.1 Create `functions/src/growth/eligibilityRules.ts`
```typescript
import { EligibilityRules } from './orchestratorTypes';

/**
 * Eligibility rules for each viral loop
 * These define when a user is eligible to see a prompt
 */
export const LOOP_ELIGIBILITY: Record<string, EligibilityRules> = {
  tutor_card: {
    requiredRole: 'tutor',
    minRating: 4.5,
    minSessions: 5,
    maxExposuresPerDay: 1,
    cooldownMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  progress_reel: {
    requiredRole: 'parent',
    minSessions: 3,
    maxExposuresPerDay: 1,
    cooldownMs: 48 * 60 * 60 * 1000, // 48 hours
  },
  
  study_buddy: {
    requiredRole: 'student',
    minSessions: 2,
    maxExposuresPerDay: 2,
    cooldownMs: 48 * 60 * 60 * 1000, // 48 hours
  },
  
  parent_pod: {
    requiredRole: 'parent',
    minSessions: 1,
    maxExposuresPerDay: 1,
    cooldownMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  tutor_peer: {
    requiredRole: 'tutor',
    minSessions: 10,
    minRating: 4.0,
    maxExposuresPerDay: 1,
    cooldownMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

/**
 * Get eligibility rules for a loop type
 */
export function getEligibilityRules(loopType: string): EligibilityRules | null {
  return LOOP_ELIGIBILITY[loopType] || null;
}
```

---

### **Step 3: Loop Orchestrator Core (2 hours)**

#### 3.1 Create `functions/src/growth/loopOrchestrator.ts`
```typescript
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getEligibilityRules } from './eligibilityRules';
import { GROWTH_FEATURE_FLAGS } from '../config/features';

const getDb = () => admin.firestore();

/**
 * Cloud Function: Get orchestrator decision
 * 
 * Called by: Mobile app before showing any viral prompt
 * 
 * Flow:
 * 1. Check feature flags (master + per-loop)
 * 2. Check user eligibility (role, sessions, rating)
 * 3. Check cooldowns (no duplicate prompts)
 * 4. Allocate experiment variant
 * 5. Return decision with rationale
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
      // Step 1: Check master feature flag
      if (!GROWTH_FEATURE_FLAGS.orchestrator.enabled) {
        return createThrottledDecision('Feature disabled', userRole);
      }
      
      // Step 2: Get user data
      const db = getDb();
      const userDoc = await db.doc(`users/${userId}`).get();
      const userData = userDoc.data();
      
      if (!userData) {
        return createThrottledDecision('User not found', userRole);
      }
      
      // Step 3: Determine eligible loops
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
      
      // Step 4: Check cooldowns
      const uncooledLoops = await filterByCooldown(userId, eligibleLoops);
      
      if (uncooledLoops.length === 0) {
        return createThrottledDecision(
          'All eligible loops on cooldown',
          userRole
        );
      }
      
      // Step 5: Select loop (prioritize by weight/context)
      const selectedLoop = selectLoop(uncooledLoops, sessionContext);
      
      // Step 6: Allocate experiment variant
      const { experimentId, variantId } = allocateExperiment(userId, selectedLoop);
      
      // Step 7: Set cooldown
      await setCooldown(userId, selectedLoop);
      
      // Step 8: Build decision
      const decision = {
        shouldShow: true,
        loopType: selectedLoop,
        persona: userRole,
        copyKey: `${selectedLoop}.${userRole}`,
        cooldownMs: getEligibilityRules(selectedLoop)!.cooldownMs,
        experimentId,
        variantId,
        rationale: `Eligible: ${selectedLoop}, variant: ${variantId}`,
        decidedAt: Date.now(),
      };
      
      // Step 9: Log exposure
      await logExposure(userId, decision, sessionContext, userRole);
      
      const latency = Date.now() - startTime;
      logger.info('✅ Orchestrator decision', {
        userId: userId.substring(0, 8),
        loopType: selectedLoop,
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
    rationale: rationale.substring(0, 240), // Truncate
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
  const loopsToCheck = requestedLoops || Object.keys(LOOP_ELIGIBILITY);
  const eligible: string[] = [];
  
  for (const loopType of loopsToCheck) {
    const rules = getEligibilityRules(loopType);
    if (!rules) continue;
    
    // Check per-loop feature flag
    if (!isLoopEnabled(loopType)) {
      continue;
    }
    
    // Check role
    if (rules.requiredRole && rules.requiredRole !== userRole) {
      continue;
    }
    
    // Check min sessions
    if (rules.minSessions) {
      const sessionCount = sessionContext?.sessionCount || 0;
      if (sessionCount < rules.minSessions) {
        continue;
      }
    }
    
    // Check min rating
    if (rules.minRating) {
      const rating = sessionContext?.rating || 0;
      if (rating < rules.minRating) {
        continue;
      }
    }
    
    // Check max exposures per day
    if (rules.maxExposuresPerDay) {
      const todayCount = await getTodayExposureCount(userId, loopType);
      if (todayCount >= rules.maxExposuresPerDay) {
        continue;
      }
    }
    
    eligible.push(loopType);
  }
  
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
      uncooled.push(loopType);
      continue;
    }
    
    const cooldown = cooldownDoc.data();
    const now = Date.now();
    const expiresAt = cooldown?.expiresAt?.toMillis() || 0;
    
    if (now >= expiresAt) {
      uncooled.push(loopType);
    }
  }
  
  return uncooled;
}

/**
 * Select which loop to show (priority/context-based)
 */
function selectLoop(
  eligibleLoops: string[],
  sessionContext: any
): string {
  // For MVP: simple first-match
  // Future: Weighted selection based on K-factor, context, etc.
  return eligibleLoops[0];
}

/**
 * Allocate experiment variant for user
 */
function allocateExperiment(
  userId: string,
  loopType: string
): { experimentId: string; variantId: string } {
  // For MVP: Return default experiment
  // Future (PR17): Consistent hashing for variant allocation
  return {
    experimentId: 'default',
    variantId: 'control',
  };
}

/**
 * Set cooldown for loop
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
}

/**
 * Log exposure for analytics
 */
async function logExposure(
  userId: string,
  decision: any,
  sessionContext: any,
  userRole: string
): Promise<void> {
  const db = getDb();
  
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
}

/**
 * Get today's exposure count for loop
 */
async function getTodayExposureCount(
  userId: string,
  loopType: string
): Promise<number> {
  const db = getDb();
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const snapshot = await db
    .collection('loop_exposures')
    .where('userId', '==', userId)
    .where('loopType', '==', loopType)
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
    .count()
    .get();
  
  return snapshot.data().count;
}

/**
 * Check if loop is enabled via feature flag
 */
function isLoopEnabled(loopType: string): boolean {
  // Import from feature flags config
  // For now, assume enabled
  return true;
}

// Import eligibility config
import { LOOP_ELIGIBILITY } from './eligibilityRules';
```

---

### **Step 4: Frontend Client Integration (1 hour)**

#### 4.1 Create `app/src/services/growth/orchestratorService.ts`
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { OrchestratorRequest, OrchestratorDecision } from '@/types/growthTypes';

const functions = getFunctions();

/**
 * Get orchestrator decision before showing viral prompt
 * 
 * Usage:
 * const decision = await getOrchestratorDecision({
 *   userRole: 'tutor',
 *   sessionContext: { rating: 5.0, sessionCount: 10 }
 * });
 * 
 * if (decision.shouldShow) {
 *   // Show prompt for decision.loopType
 * }
 */
export async function getOrchestratorDecision(
  request: Omit<OrchestratorRequest, 'userId'>
): Promise<OrchestratorDecision> {
  try {
    const decisionFn = httpsCallable<any, OrchestratorDecision>(
      functions,
      'getOrchestratorDecision'
    );
    
    const result = await decisionFn(request);
    
    console.log('🎯 Orchestrator decision:', {
      shouldShow: result.data.shouldShow,
      loopType: result.data.loopType,
      rationale: result.data.rationale,
    });
    
    return result.data;
  } catch (error: any) {
    console.error('❌ Orchestrator failed:', error.message);
    
    // Graceful fallback: don't show prompt
    return {
      shouldShow: false,
      persona: request.userRole,
      rationale: 'Service unavailable',
      decidedAt: Date.now(),
    };
  }
}
```

---

### **Step 5: Feature Flags (15 min)**

Update `app/src/config/featureFlags.ts`:
```typescript
export const GROWTH_FEATURE_FLAGS: GrowthFeatureFlags = {
  enabled: true,
  
  referralAttribution: {
    enabled: true,
    provider: 'custom',
  },
  
  // PR16: Loop Orchestrator
  orchestrator: {
    enabled: true, // ← Enable for PR16
  },
  
  // ...rest
};
```

---

### **Step 6: Export Functions (5 min)**

Update `functions/src/index.ts`:
```typescript
// Growth functions (PR15)
export {
  createReferralLink,
  trackReferralClick,
  getReferralChain,
} from './growth/referralHandler';

// Orchestrator (PR16)
export { getOrchestratorDecision } from './growth/loopOrchestrator';
```

---

### **Step 7: Testing (1.5 hours)**

#### 7.1 Create `functions/__tests__/loopOrchestrator.test.ts`
```typescript
describe('Loop Orchestrator', () => {
  describe('Eligibility Rules', () => {
    it('respects role requirements', async () => {
      // Tutor trying to get parent loop -> rejected
    });
    
    it('enforces min sessions', async () => {
      // User with 2 sessions trying loop requiring 5 -> rejected
    });
    
    it('enforces min rating', async () => {
      // Tutor with 4.0 rating trying loop requiring 4.5 -> rejected
    });
  });
  
  describe('Cooldown Enforcement', () => {
    it('prevents duplicate prompts within cooldown', async () => {
      // Show once -> cooldown set -> try again -> rejected
    });
    
    it('allows prompts after cooldown expires', async () => {
      // Mock time to test expiration
    });
  });
  
  describe('Performance', () => {
    it('decides in <150ms', async () => {
      // Measure latency
    });
  });
});
```

---

## 🚀 Deployment Steps

1. **Deploy Firestore Rules & Indexes**
```bash
firebase deploy --only firestore
```

2. **Deploy Cloud Functions**
```bash
cd functions && pnpm run build && cd ..
firebase deploy --only functions:getOrchestratorDecision
```

3. **Test in App**
- Add test button like PR15
- Call `getOrchestratorDecision()`
- Verify decision returned <150ms
- Check Firestore: `/cooldowns/{userId}/loops/{loopType}` created
- Check Firestore: `/loop_exposures` logged

---

## ✅ Definition of Done

- [ ] Decision engine responds <150ms (P95)
- [ ] Cooldowns prevent duplicates
- [ ] Eligibility rules enforced
- [ ] Exposures logged to Firestore
- [ ] Feature flag works (ON/OFF)
- [ ] Unit tests pass (80% coverage)
- [ ] Manual testing complete
- [ ] Functions deployed

---

**Estimated Time:** 8-10 hours (1-2 days)  
**Next PR:** PR17 (Experimentation Framework) or PR18 (Tutor Cards - first viral loop!)

