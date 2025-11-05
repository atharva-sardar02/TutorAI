# PR25 – Incentives & Economy Agent
**Implementation Plan**

---

## 📋 Overview

**Goal:** Reward matrix by persona/subject, budget caps, expiration, anti-abuse checks, redemption flow, unit-economics telemetry (CAC/LTV deltas)  
**Owner:** Engineer A (Backend)  
**Effort:** 6-10 days (Large)  
**Risk:** Medium  
**Dependencies:** PR16 (orchestrator), PR22 (fraud detection - can stub for now)  
**Kill-Switch:** `growth.incentives.enabled`

---

## ✅ Acceptance Criteria

- [ ] Deterministic rewards with idempotency (zero duplicates)
- [ ] Budget caps honored (daily + per-user)
- [ ] Expiration enforced (class passes expire 90 days)
- [ ] Anti-abuse checks integrated
- [ ] Redemption flow atomic (no double-spend)
- [ ] Audit log present (100% actions logged)
- [ ] Uplift + cost dashboards show per-loop ROI
- [ ] Balance updates in real-time (client UI)
- [ ] 80% test coverage
- [ ] Clawbacks work (revoke flagged users)

---

## 🗂️ Files to Create/Modify

### **Backend (Functions)**
```
functions/src/
├── growth/
│   ├── incentivesAgent.ts       [NEW] - Core reward engine
│   ├── rewardMatrix.ts          [NEW] - Reward definitions
│   └── computeMetrics.ts        [MODIFY] - Add ROI tracking
├── types/
│   └── incentiveTypes.ts        [NEW] - TypeScript interfaces
└── index.ts                     [MODIFY] - Export functions
```

### **Frontend (App)**
```
app/src/
├── types/
│   └── growthTypes.ts           [MODIFY] - Add reward types
├── components/growth/
│   ├── RewardsBalanceCard.tsx   [NEW] - Balance display
│   └── RedemptionModal.tsx      [NEW] - Redemption UI
├── services/growth/
│   └── incentivesService.ts     [NEW] - Client API wrapper
└── config/
    └── featureFlags.ts          [MODIFY] - Add incentives flag
```

### **Infrastructure**
```
firestore.rules                  [MODIFY] - Add rewards/balances rules
firestore.indexes.json           [MODIFY] - Add reward indexes
```

### **Tests**
```
functions/__tests__/
├── incentivesAgent.test.ts      [NEW] - Reward logic tests
└── integration/
    └── redemption.e2e.test.ts   [NEW] - Full redemption flow
```

---

## 📐 Step-by-Step Implementation

### **Step 1: TypeScript Types & Reward Matrix (1 hour)**

#### 1.1 Update `app/src/types/growthTypes.ts`

Add at the end:
```typescript
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
  userId: string;
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
```

#### 1.2 Create `functions/src/types/incentiveTypes.ts`
```typescript
/**
 * Incentive types for server-side use
 * (Mirrors app/src/types/growthTypes.ts but with server-specific fields)
 */

export type RewardType = 'xp' | 'class_pass' | 'streak_shield' | 'badge';

export interface RewardConfig {
  type: RewardType;
  amount: number;
  description: string;
  expiresInDays?: number;
}

export interface RewardMatrix {
  [loopType: string]: {
    [persona: string]: {
      [subject: string]: RewardConfig;
    };
  };
}
```

#### 1.3 Create `functions/src/growth/rewardMatrix.ts`
```typescript
import { RewardConfig, RewardMatrix } from '../types/incentiveTypes';

/**
 * Reward matrix: loopType × persona × subject → reward
 * 
 * This defines what rewards users get for different viral actions
 * based on their role and subject area.
 */
export const REWARD_MATRIX: RewardMatrix = {
  // Tutor Card sharing
  tutor_card: {
    tutor: {
      math: { type: 'xp', amount: 110, description: 'Math tutor card shared' }, // +10% for math
      science: { type: 'xp', amount: 105, description: 'Science tutor card shared' }, // +5% for science
      default: { type: 'xp', amount: 100, description: 'Tutor card shared' },
    },
    parent: {
      default: { type: 'xp', amount: 50, description: 'Shared tutor card' },
    },
    student: {
      default: { type: 'xp', amount: 50, description: 'Shared tutor card' },
    },
  },
  
  // Progress reel sharing
  progress_reel: {
    tutor: {
      default: { type: 'class_pass', amount: 1, description: 'Progress reel bonus', expiresInDays: 90 },
    },
    parent: {
      default: { type: 'class_pass', amount: 1, description: 'Shared progress', expiresInDays: 90 },
    },
    student: {
      default: { type: 'xp', amount: 75, description: 'Shared progress' },
    },
  },
  
  // Study buddy challenge
  study_buddy: {
    student: {
      default: { type: 'streak_shield', amount: 1, description: 'Challenge completed', expiresInDays: 7 },
    },
    tutor: {
      default: { type: 'xp', amount: 50, description: 'Study buddy facilitated' },
    },
    parent: {
      default: { type: 'xp', amount: 50, description: 'Study buddy facilitated' },
    },
  },
  
  // Parent pod invites
  parent_pod: {
    parent: {
      default: { type: 'class_pass', amount: 1, description: 'Parent pod invite', expiresInDays: 90 },
    },
    tutor: {
      default: { type: 'xp', amount: 75, description: 'Pod facilitated' },
    },
    student: {
      default: { type: 'xp', amount: 25, description: 'Pod joined' },
    },
  },
  
  // Tutor-to-tutor referral
  tutor_peer: {
    tutor: {
      default: { type: 'xp', amount: 200, description: 'Tutor referral bonus' },
    },
    parent: {
      default: { type: 'xp', amount: 50, description: 'Tutor referral' },
    },
    student: {
      default: { type: 'xp', amount: 50, description: 'Tutor referral' },
    },
  },
  
  // Results sharing
  results: {
    student: {
      default: { type: 'xp', amount: 50, description: 'Results shared' },
    },
    parent: {
      default: { type: 'xp', amount: 50, description: 'Results shared' },
    },
    tutor: {
      default: { type: 'xp', amount: 75, description: 'Results facilitated' },
    },
  },
};

/**
 * Get reward configuration for a specific loop + persona + subject
 */
export function getRewardConfig(
  loopType: string,
  persona: string,
  subject?: string
): RewardConfig {
  const loopRewards = REWARD_MATRIX[loopType];
  if (!loopRewards) {
    // Default reward if loop not in matrix
    return { type: 'xp', amount: 50, description: 'Participation bonus' };
  }
  
  const personaRewards = loopRewards[persona];
  if (!personaRewards) {
    // Fallback to 'default' persona or parent
    const fallbackRewards = loopRewards.default || loopRewards.parent || loopRewards.tutor;
    if (!fallbackRewards) {
      return { type: 'xp', amount: 50, description: 'Participation bonus' };
    }
    return fallbackRewards.default || fallbackRewards[Object.keys(fallbackRewards)[0]];
  }
  
  // Try subject-specific reward, then default
  const subjectReward = subject ? personaRewards[subject.toLowerCase()] : null;
  return subjectReward || personaRewards.default || personaRewards[Object.keys(personaRewards)[0]];
}

/**
 * Default reward policy
 */
export const DEFAULT_REWARD_POLICY = {
  dailyCaps: {
    classPassTotal: 100,
    xpTotal: 10000,
  },
  perUserCaps: {
    classPassPerMonth: 5,
    xpPerWeek: 1000,
  },
  expirations: {
    classPassDays: 90,
    streakShieldDays: 7,
  },
  abuseLimits: {
    maxRewardsPerDay: 10,
  },
};
```

---

### **Step 2: Firestore Schema & Rules (45 min)**

#### 2.1 Update `firestore.rules`

Add after `/loop_exposures` rules:
```javascript
// --- REWARDS COLLECTION (PR25) ---
// Individual reward grants (immutable audit trail)
match /rewards/{userId}/grants/{rewardId} {
  // Users can read their own rewards
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Only Cloud Functions can write
  allow write: if false;
}

// --- BALANCES COLLECTION (PR25) ---
// Aggregate user balances (XP, class passes, etc.)
match /balances/{userId} {
  // Users can read their own balance
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Only Cloud Functions can write
  allow write: if false;
}

// --- REDEMPTIONS COLLECTION (PR25) ---
// History of reward redemptions
match /redemptions/{userId}/history/{redemptionId} {
  // Users can read their own redemption history
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Only Cloud Functions can write
  allow write: if false;
}

// --- REWARD_POLICY COLLECTION (PR25) ---
// Global reward configuration
match /reward_policy/{docId} {
  // Anyone authenticated can read policy
  allow read: if request.auth != null;
  
  // Only admins can write
  allow write: if request.auth != null && request.auth.token.admin == true;
}

// --- REWARDS_AUDIT_LOG COLLECTION (PR25) ---
// Audit trail for all reward operations
match /rewards_audit_log/{logId} {
  // Only admins can read (for debugging)
  allow read: if request.auth != null && request.auth.token.admin == true;
  
  // Only Cloud Functions can write
  allow write: if false;
}
```

#### 2.2 Update `firestore.indexes.json`

Add these composite indexes:
```json
{
  "indexes": [
    // ... existing indexes ...
    
    {
      "collectionGroup": "grants",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "grantedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "grants",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "history",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "redeemedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "rewards_audit_log",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "rewards_audit_log",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "action", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

### **Step 3: Core Incentives Agent (3 hours)**

#### 3.1 Create `functions/src/growth/incentivesAgent.ts`
```typescript
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getRewardConfig, DEFAULT_REWARD_POLICY } from './rewardMatrix';
import { RewardConfig } from '../types/incentiveTypes';

const getDb = () => admin.firestore();

/**
 * Generate unique reward ID
 */
function generateRewardId(): string {
  return `rwd_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Generate unique request key for idempotency
 */
function generateRequestKey(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Cloud Function: Issue Reward
 * 
 * Grants a reward to a user based on viral loop completion
 * Features:
 * - Idempotent (requestKey prevents duplicates)
 * - Budget caps (daily + per-user)
 * - Anti-abuse checks
 * - Expiration tracking
 */
export const issueReward = onCall<
  {
    userId?: string;
    loopType: string;
    context?: {
      rating?: number;
      sessionCount?: number;
      subject?: string;
    };
    requestKey?: string;
  },
  Promise<{
    success: boolean;
    reward?: RewardConfig;
    rationale: string;
    balances?: any;
  }>
>(async (request) => {
  const { auth, data } = request;
  const { loopType, context, requestKey: providedKey } = data;
  const userId = data.userId || auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'Authentication required or userId must be provided.');
  }

  // Generate or use provided request key for idempotency
  const requestKey = providedKey || generateRequestKey();

  try {
    const db = getDb();

    // 1. Check for duplicate request (idempotency)
    const existingReward = await db
      .collection(`rewards/${userId}/grants`)
      .where('requestKey', '==', requestKey)
      .limit(1)
      .get();

    if (!existingReward.empty) {
      const existingData = existingReward.docs[0].data();
      logger.info('🔁 Duplicate reward request (idempotent)', {
        userId: userId.substring(0, 8),
        requestKey: requestKey.substring(0, 16),
      });
      return {
        success: true,
        reward: {
          type: existingData.type,
          amount: existingData.amount,
          description: existingData.description,
        },
        rationale: 'Already granted (idempotent)',
      };
    }

    // 2. Get user profile for persona
    const userDoc = await db.doc(`users/${userId}`).get();
    const userData = userDoc.data();
    const persona = userData?.role || 'parent';

    // 3. Determine reward from matrix
    const subject = context?.subject;
    const rewardConfig = getRewardConfig(loopType, persona, subject);

    // 4. Check abuse limits (max 10 rewards/day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = admin.firestore.Timestamp.fromDate(today);

    const todaysRewards = await db
      .collection(`rewards/${userId}/grants`)
      .where('grantedAt', '>=', todayTimestamp)
      .get();

    if (todaysRewards.size >= DEFAULT_REWARD_POLICY.abuseLimits.maxRewardsPerDay) {
      logger.warn('⚠️ User hit daily reward cap', {
        userId: userId.substring(0, 8),
        rewardsToday: todaysRewards.size,
      });
      return {
        success: false,
        rationale: `Daily reward limit reached (${DEFAULT_REWARD_POLICY.abuseLimits.maxRewardsPerDay}/day)`,
      };
    }

    // 5. Check per-user caps (class passes, XP)
    if (rewardConfig.type === 'class_pass') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoTimestamp = admin.firestore.Timestamp.fromDate(monthAgo);

      const monthlyClassPasses = await db
        .collection(`rewards/${userId}/grants`)
        .where('type', '==', 'class_pass')
        .where('grantedAt', '>=', monthAgoTimestamp)
        .get();

      if (monthlyClassPasses.size >= DEFAULT_REWARD_POLICY.perUserCaps.classPassPerMonth) {
        logger.warn('⚠️ User hit monthly class pass cap', {
          userId: userId.substring(0, 8),
          classPassesThisMonth: monthlyClassPasses.size,
        });
        return {
          success: false,
          rationale: `Monthly class pass limit reached (${DEFAULT_REWARD_POLICY.perUserCaps.classPassPerMonth}/month)`,
        };
      }
    }

    // 6. Check global daily caps (TODO: implement global counters)
    // For MVP, skip global caps (would require distributed counter)

    // 7. Calculate expiration
    let expiresAt: admin.firestore.Timestamp | undefined;
    if (rewardConfig.expiresInDays) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + rewardConfig.expiresInDays);
      expiresAt = admin.firestore.Timestamp.fromDate(expirationDate);
    }

    // 8. Grant reward (write to /rewards/{userId}/grants/{rewardId})
    const rewardId = generateRewardId();
    const rewardDoc = {
      rewardId,
      userId,
      type: rewardConfig.type,
      amount: rewardConfig.amount,
      description: rewardConfig.description,
      loopType,
      requestKey,
      grantedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt || null,
      clawedBack: false,
      metadata: { ...context, persona },
    };

    await db.doc(`rewards/${userId}/grants/${rewardId}`).set(rewardDoc);

    // 9. Update balances (atomic increment)
    const balanceRef = db.doc(`balances/${userId}`);
    const balanceFieldMap = {
      xp: 'xpBalance',
      class_pass: 'classPassCount',
      streak_shield: 'streakShieldCount',
      badge: 'badgeCount',
    };
    const balanceField = balanceFieldMap[rewardConfig.type] || 'xpBalance';

    await balanceRef.set(
      {
        userId,
        [balanceField]: admin.firestore.FieldValue.increment(rewardConfig.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 10. Log to audit trail
    await db.collection('rewards_audit_log').add({
      userId,
      action: 'grant',
      rewardType: rewardConfig.type,
      amount: rewardConfig.amount,
      loopType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { rewardId, requestKey },
    });

    logger.info('✅ Reward granted', {
      userId: userId.substring(0, 8),
      rewardId: rewardId.substring(0, 12),
      type: rewardConfig.type,
      amount: rewardConfig.amount,
      loopType,
    });

    // 11. Return success with updated balance
    const updatedBalance = await balanceRef.get();
    return {
      success: true,
      reward: rewardConfig,
      rationale: `Granted ${rewardConfig.amount} ${rewardConfig.type} for ${loopType}`,
      balances: updatedBalance.data(),
    };
  } catch (error: any) {
    logger.error('❌ Error issuing reward', {
      error: error.message,
      userId: userId?.substring(0, 8),
      loopType,
      stack: error.stack,
    });
    throw new HttpsError('internal', 'Failed to issue reward', error.message);
  }
});

/**
 * Cloud Function: Redeem Reward
 * 
 * Allows users to redeem their earned rewards (e.g., use a class pass)
 */
export const redeemReward = onCall<
  {
    type: 'xp' | 'class_pass' | 'streak_shield' | 'badge';
    amount: number;
    metadata?: any;
  },
  Promise<{ success: boolean; remainingBalance: number }>
>(async (request) => {
  const { auth, data } = request;
  const { type, amount, metadata } = data;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const userId = auth.uid;

  try {
    const db = getDb();
    const balanceRef = db.doc(`balances/${userId}`);

    // Run in transaction to prevent double-spend
    const result = await db.runTransaction(async (transaction) => {
      const balanceDoc = await transaction.get(balanceRef);

      if (!balanceDoc.exists) {
        throw new HttpsError('not-found', 'Balance not found. No rewards to redeem.');
      }

      const balanceData = balanceDoc.data()!;
      const balanceFieldMap = {
        xp: 'xpBalance',
        class_pass: 'classPassCount',
        streak_shield: 'streakShieldCount',
        badge: 'badgeCount',
      };
      const balanceField = balanceFieldMap[type];
      const currentBalance = balanceData[balanceField] || 0;

      // Check sufficient balance
      if (currentBalance < amount) {
        throw new HttpsError(
          'failed-precondition',
          `Insufficient balance. Have ${currentBalance}, need ${amount}.`
        );
      }

      // Deduct balance
      transaction.update(balanceRef, {
        [balanceField]: admin.firestore.FieldValue.increment(-amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log redemption
      const redemptionId = `red_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      transaction.set(db.doc(`redemptions/${userId}/history/${redemptionId}`), {
        redemptionId,
        userId,
        type,
        amount,
        description: `Redeemed ${amount} ${type}`,
        redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: metadata || {},
      });

      // Audit log
      transaction.set(db.collection('rewards_audit_log').doc(), {
        userId,
        action: 'redeem',
        rewardType: type,
        amount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { redemptionId, ...metadata },
      });

      return currentBalance - amount;
    });

    logger.info('✅ Reward redeemed', {
      userId: userId.substring(0, 8),
      type,
      amount,
      remainingBalance: result,
    });

    return { success: true, remainingBalance: result };
  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }

    logger.error('❌ Error redeeming reward', {
      error: error.message,
      userId: userId.substring(0, 8),
      type,
      amount,
    });
    throw new HttpsError('internal', 'Failed to redeem reward', error.message);
  }
});

/**
 * Cloud Function: Get User Balance
 */
export const getUserBalance = onCall(async (request) => {
  const { auth } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  try {
    const db = getDb();
    const balanceDoc = await db.doc(`balances/${auth.uid}`).get();

    if (!balanceDoc.exists) {
      // Return zero balances
      return {
        xpBalance: 0,
        classPassCount: 0,
        streakShieldCount: 0,
        badgeCount: 0,
      };
    }

    return balanceDoc.data();
  } catch (error: any) {
    logger.error('❌ Error getting balance', {
      error: error.message,
      userId: auth.uid.substring(0, 8),
    });
    throw new HttpsError('internal', 'Failed to get balance', error.message);
  }
});

/**
 * Admin function: Clawback reward (revoke due to fraud)
 */
export const clawbackReward = onCall<
  { userId: string; rewardId: string; reason: string },
  Promise<{ success: boolean }>
>(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Admin auth required.');
  }

  // TODO: Check admin role
  // const userDoc = await getDb().doc(`users/${auth.uid}`).get();
  // if (!userDoc.data()?.admin) {
  //   throw new HttpsError('permission-denied', 'Admin access required');
  // }

  const { userId, rewardId, reason } = data;

  try {
    const db = getDb();
    const rewardRef = db.doc(`rewards/${userId}/grants/${rewardId}`);
    const rewardDoc = await rewardRef.get();

    if (!rewardDoc.exists) {
      throw new HttpsError('not-found', 'Reward not found.');
    }

    const rewardData = rewardDoc.data()!;

    if (rewardData.clawedBack) {
      return { success: true }; // Already clawed back
    }

    // Mark as clawed back
    await rewardRef.update({
      clawedBack: true,
      clawedBackAt: admin.firestore.FieldValue.serverTimestamp(),
      clawbackReason: reason,
    });

    // Deduct from balance
    const balanceRef = db.doc(`balances/${userId}`);
    const balanceFieldMap = {
      xp: 'xpBalance',
      class_pass: 'classPassCount',
      streak_shield: 'streakShieldCount',
      badge: 'badgeCount',
    };
    const balanceField = balanceFieldMap[rewardData.type];

    await balanceRef.update({
      [balanceField]: admin.firestore.FieldValue.increment(-rewardData.amount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Audit log
    await db.collection('rewards_audit_log').add({
      userId,
      action: 'clawback',
      rewardType: rewardData.type,
      amount: rewardData.amount,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { rewardId, reason },
    });

    logger.info('✅ Reward clawed back', {
      userId: userId.substring(0, 8),
      rewardId: rewardId.substring(0, 12),
      reason,
    });

    return { success: true };
  } catch (error: any) {
    logger.error('❌ Error clawing back reward', {
      error: error.message,
      userId: userId?.substring(0, 8),
      rewardId: rewardId?.substring(0, 12),
    });
    throw new HttpsError('internal', 'Failed to clawback reward', error.message);
  }
});
```

---

### **Step 4: Export Functions & Feature Flag (15 min)**

#### 4.1 Update `functions/src/index.ts`

Add exports:
```typescript
// Incentives & Economy (PR25)
export { 
  issueReward, 
  redeemReward, 
  getUserBalance,
  clawbackReward
} from './growth/incentivesAgent';
```

#### 4.2 Update `app/src/config/featureFlags.ts`

Add:
```typescript
// PR25: Incentives & Economy
incentives: {
  enabled: true, // ✅ Enabled for PR25
},
```

---

### **Step 5: Client-Side Integration (2 hours)**

#### 5.1 Create `app/src/services/growth/incentivesService.ts`
```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

/**
 * Issue reward to user
 */
export async function issueReward(
  loopType: string,
  context?: {
    rating?: number;
    sessionCount?: number;
    subject?: string;
  }
): Promise<{
  success: boolean;
  reward?: any;
  rationale: string;
  balances?: any;
}> {
  try {
    const issueRewardFn = httpsCallable(functions, 'issueReward');
    const result = await issueRewardFn({ loopType, context });
    return result.data as any;
  } catch (error: any) {
    console.error('❌ Error issuing reward:', error);
    throw error;
  }
}

/**
 * Redeem reward (e.g., use class pass)
 */
export async function redeemReward(
  type: 'xp' | 'class_pass' | 'streak_shield' | 'badge',
  amount: number,
  metadata?: any
): Promise<{ success: boolean; remainingBalance: number }> {
  try {
    const redeemRewardFn = httpsCallable(functions, 'redeemReward');
    const result = await redeemRewardFn({ type, amount, metadata });
    return result.data as any;
  } catch (error: any) {
    console.error('❌ Error redeeming reward:', error);
    throw error;
  }
}

/**
 * Get user's current balance
 */
export async function getUserBalance(): Promise<{
  xpBalance: number;
  classPassCount: number;
  streakShieldCount: number;
  badgeCount: number;
}> {
  try {
    const getBalanceFn = httpsCallable(functions, 'getUserBalance');
    const result = await getBalanceFn();
    return result.data as any;
  } catch (error: any) {
    console.error('❌ Error getting balance:', error);
    throw error;
  }
}
```

#### 5.2 Create `app/src/components/growth/RewardsBalanceCard.tsx`
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getUserBalance } from '@/services/growth/incentivesService';

export default function RewardsBalanceCard() {
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const data = await getUserBalance();
      setBalance(data);
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator />;
  }

  if (!balance) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Rewards</Text>
      
      <View style={styles.balanceRow}>
        <Text style={styles.label}>⭐ XP:</Text>
        <Text style={styles.value}>{balance.xpBalance || 0}</Text>
      </View>
      
      <View style={styles.balanceRow}>
        <Text style={styles.label}>🎟️ Class Passes:</Text>
        <Text style={styles.value}>{balance.classPassCount || 0}</Text>
      </View>
      
      <View style={styles.balanceRow}>
        <Text style={styles.label}>🛡️ Streak Shields:</Text>
        <Text style={styles.value}>{balance.streakShieldCount || 0}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
```

---

### **Step 6: Testing (2 hours)**

#### 6.1 Create `functions/__tests__/incentivesAgent.test.ts`
```typescript
import { issueReward, redeemReward } from '../src/growth/incentivesAgent';
import { getRewardConfig } from '../src/growth/rewardMatrix';

describe('Incentives Agent', () => {
  describe('Reward Matrix', () => {
    it('returns correct reward for tutor card + tutor + math', () => {
      const reward = getRewardConfig('tutor_card', 'tutor', 'math');
      expect(reward.type).toBe('xp');
      expect(reward.amount).toBe(110); // Math gets +10%
    });
    
    it('falls back to default for unknown subject', () => {
      const reward = getRewardConfig('tutor_card', 'tutor', 'unknown');
      expect(reward.type).toBe('xp');
      expect(reward.amount).toBe(100); // Default tutor amount
    });
    
    it('returns class pass for progress reel', () => {
      const reward = getRewardConfig('progress_reel', 'tutor');
      expect(reward.type).toBe('class_pass');
      expect(reward.amount).toBe(1);
      expect(reward.expiresInDays).toBe(90);
    });
  });
  
  // TODO: Add integration tests with Firebase emulator
  // - Test idempotency (same requestKey)
  // - Test daily cap enforcement
  // - Test balance updates
  // - Test redemption transaction
});
```

---

## 🚀 Deployment Steps

### **Step 1: Deploy Firestore Rules & Indexes**
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### **Step 2: Create Reward Policy Document**
Manually create in Firestore Console:
- Collection: `reward_policy`
- Document ID: `global`
- Fields: (copy from `DEFAULT_REWARD_POLICY` in `rewardMatrix.ts`)

### **Step 3: Build & Deploy Functions**
```bash
cd functions
pnpm run build
cd ..
firebase deploy --only functions:issueReward,functions:redeemReward,functions:getUserBalance,functions:clawbackReward
```

### **Step 4: Test in App**

Add test button to `app/app/(tabs)/index.tsx`:
```typescript
const testRewards = async () => {
  try {
    console.log('💰 Testing reward system...');
    
    // Issue reward
    const issueResult = await issueReward('tutor_card', {
      rating: 5.0,
      sessionCount: 10,
      subject: 'math',
    });
    console.log('✅ Reward issued:', issueResult);
    
    // Get balance
    const balance = await getUserBalance();
    console.log('📊 Balance:', balance);
    
    Alert.alert('Rewards Test ✅', JSON.stringify({ issueResult, balance }, null, 2));
  } catch (err: any) {
    console.error('❌ Error:', err);
    Alert.alert('Error ❌', err.message);
  }
};
```

---

## ✅ Definition of Done

- [ ] Reward matrix defined (5 loops × 3 personas)
- [ ] Firestore schema deployed
- [ ] Incentives agent functions deployed
- [ ] Idempotency tested (duplicate requests)
- [ ] Budget caps tested (daily + per-user)
- [ ] Redemption flow tested (atomic transaction)
- [ ] Balance card UI added to profile
- [ ] Audit log verified (100% actions logged)
- [ ] Feature flag configured
- [ ] Manual testing complete

---

**Estimated Time:** 12-15 hours (2-3 days)  
**Next PR:** PR32 (Feature Kills) - Now you have fallback rewards! 🎉

