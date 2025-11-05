# PR17 – Experimentation Framework
**Implementation Plan**

---

## 📋 Overview

**Goal:** A/B testing infrastructure with K-factor computation, guardrails, and auto-pause  
**Owner:** Engineer A (Backend)  
**Effort:** 3-5 days (Medium)  
**Risk:** Medium  
**Dependencies:** PR15 (referral events), PR16 (loop exposures)  
**Kill-Switch:** `growth.experiments.enabled`

---

## ✅ Acceptance Criteria

- [ ] Experiments can be created and managed
- [ ] Consistent variant allocation (same user → same variant)
- [ ] K-factor computed daily by experiment/variant
- [ ] Guardrails auto-pause experiments
- [ ] All growth events tagged with experimentId/variantId
- [ ] Admin can query results via API
- [ ] 80% test coverage

---

## 📐 Step-by-Step Implementation

### **Step 1: Experiment Schema (1 hour)**

Define experiment structure in Firestore

**Files to create/modify:**
- `app/src/types/growthTypes.ts` – Add experiment types
- `firestore.rules` – Security rules for `/experiments`
- `firestore.indexes.json` – Query indexes

**Schema:**
```typescript
interface Experiment {
  experimentId: string;
  name: string;
  description: string;
  loopType: string;           // Which loop this tests
  status: 'draft' | 'active' | 'paused' | 'completed';
  
  // Variants
  variants: {
    variantId: string;        // e.g., 'control', 'variant_a'
    name: string;             // e.g., 'Control', 'New Copy'
    allocationPct: number;    // 0-100, must sum to 100
    metadata?: any;           // Variant-specific config
  }[];
  
  // Guardrails
  guardrails: {
    maxSpamRate: number;      // e.g., 0.005 (0.5%)
    maxOptOutRate: number;    // e.g., 0.01 (1%)
    maxCostMultiplier: number; // e.g., 1.2 (120% of baseline)
  };
  
  // Dates
  startDate: Timestamp;
  endDate?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}
```

**Firestore rules:**
```firestore
match /experiments/{experimentId} {
  // Anyone can read (for variant allocation)
  allow read: if request.auth != null;
  
  // Only admins can write
  allow write: if request.auth.token.admin == true;
}
```

---

### **Step 2: Variant Allocation (1.5 hours)**

Implement consistent hashing for variant assignment

**Files to create:**
- `functions/src/growth/experimentService.ts`

**Key functions:**
```typescript
/**
 * Get variant for user in experiment
 * Uses consistent hashing to ensure same user always gets same variant
 */
async function getUserVariant(
  userId: string,
  experimentId: string
): Promise<{ variantId: string; experimentId: string } | null>

/**
 * Hash userId + experimentId to 0-100 range
 * Then map to variant based on allocation %
 */
function hashToVariant(
  userId: string,
  experimentId: string,
  variants: Variant[]
): string
```

**Algorithm:**
1. Hash `userId + experimentId` using MD5 or SHA256
2. Convert hash to number 0-99
3. Map to variant:
   - Control: 0-49 (50%)
   - Variant A: 50-99 (50%)

**Performance target:** <50ms

---

### **Step 3: Event Logging (1 hour)**

Capture growth events with experiment metadata

**Files to modify:**
- `functions/src/growth/loopOrchestrator.ts` – Add experimentId to exposures
- `functions/src/growth/referralHandler.ts` – Add experimentId to referrals
- `app/src/types/growthTypes.ts` – Add experiment fields to event types

**Events to track:**
- `loop_exposed` – User saw a viral prompt
- `invite_sent` – User sent an invite
- `invite_opened` – Invitee opened the link
- `join_completed` – Invitee signed up
- `fvm_reached` – Invitee completed first value moment

**Event schema:**
```typescript
{
  eventType: string,
  userId: string,
  loopType: string,
  experimentId?: string,
  variantId?: string,
  timestamp: Timestamp,
  metadata?: any
}
```

---

### **Step 4: K-Factor Computation (2 hours)**

Scheduled job to compute K-factor daily

**Files to create:**
- `functions/src/growth/computeMetrics.ts`

**K-Factor Formula:**
```
K = (invites per user) × (joins per invite)
```

**Computation logic:**
```typescript
// Scheduled function (runs daily at 2am UTC)
export const computeKFactor = onSchedule(
  {
    schedule: 'every day 02:00',
    timeZone: 'UTC',
  },
  async () => {
    // For each active experiment
    const experiments = await getActiveExperiments();
    
    for (const experiment of experiments) {
      for (const variant of experiment.variants) {
        // Get users in this variant
        const users = await getUsersInVariant(experiment.experimentId, variant.variantId);
        
        // Count invites
        const invites = await countInvites(users, experiment.experimentId, variant.variantId);
        
        // Count joins
        const joins = await countJoins(invites);
        
        // Compute K
        const invitesPerUser = invites.length / users.length;
        const joinsPerInvite = joins.length / invites.length;
        const kFactor = invitesPerUser * joinsPerInvite;
        
        // Save to Firestore
        await saveKFactor(experiment.experimentId, variant.variantId, kFactor, {
          users: users.length,
          invites: invites.length,
          joins: joins.length,
          date: new Date(),
        });
      }
    }
  }
);
```

**Output:** `/experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}`

---

### **Step 5: Guardrails (1.5 hours)**

Auto-pause experiments if metrics exceed thresholds

**Files to create:**
- `functions/src/growth/guardrails.ts`

**Guardrail checks (run hourly):**
```typescript
export const checkGuardrails = onSchedule(
  { schedule: 'every 1 hours' },
  async () => {
    const experiments = await getActiveExperiments();
    
    for (const experiment of experiments) {
      // Check spam rate
      const spamRate = await calculateSpamRate(experiment.experimentId);
      if (spamRate > experiment.guardrails.maxSpamRate) {
        await pauseExperiment(experiment.experimentId, 'High spam rate');
        await alertAdmins(experiment, 'spam', spamRate);
      }
      
      // Check opt-out rate
      const optOutRate = await calculateOptOutRate(experiment.experimentId);
      if (optOutRate > experiment.guardrails.maxOptOutRate) {
        await pauseExperiment(experiment.experimentId, 'High opt-out rate');
        await alertAdmins(experiment, 'opt-out', optOutRate);
      }
      
      // Check cost anomaly
      const costMultiplier = await calculateCostMultiplier(experiment.experimentId);
      if (costMultiplier > experiment.guardrails.maxCostMultiplier) {
        await pauseExperiment(experiment.experimentId, 'Cost anomaly');
        await alertAdmins(experiment, 'cost', costMultiplier);
      }
    }
  }
);
```

**Triggers:**
- Spam rate >0.5%
- Opt-out rate >1%
- Cost >120% of baseline

---

### **Step 6: Admin API Endpoints (1.5 hours)**

Endpoints for querying experiment results

**Files to create:**
- `functions/src/growth/experimentAdminApi.ts`

**Endpoints:**
```typescript
// List all experiments
export const listExperiments = onCall({ ... }, async (request) => {
  // Return: all experiments with status, dates, K-factor
});

// Get experiment details
export const getExperiment = onCall({ ... }, async (request) => {
  const { experimentId } = request.data;
  // Return: experiment + variants + metrics + funnel
});

// Create experiment
export const createExperiment = onCall({ ... }, async (request) => {
  // Admin only
  // Create experiment in Firestore
});

// Update experiment (pause/resume, adjust allocation)
export const updateExperiment = onCall({ ... }, async (request) => {
  // Admin only
  // Update experiment status or allocation %
});

// Get K-factor by variant
export const getKFactor = onCall({ ... }, async (request) => {
  const { experimentId, variantId, startDate, endDate } = request.data;
  // Return: K-factor time series
});
```

---

### **Step 7: Orchestrator Integration (30 min)**

Update orchestrator to allocate variants

**Files to modify:**
- `functions/src/growth/loopOrchestrator.ts`

**Changes:**
```typescript
// Step 5 (new): Allocate experiment variant
const { experimentId, variantId } = await allocateExperiment(userId, selectedLoop);

// Update decision to include experiment info
const decision = {
  shouldShow: true,
  loopType: selectedLoop,
  experimentId,
  variantId,
  // ... rest of decision
};
```

---

### **Step 8: Client Integration (30 min)**

Tag all growth events with experimentId/variantId

**Files to modify:**
- `app/src/services/growth/orchestratorService.ts`
- `app/src/services/growth/referralService.ts`

**Changes:**
```typescript
// When sending invite
await createReferralLink({
  loopType,
  experimentId: decision.experimentId,
  variantId: decision.variantId,
});

// When logging events
analytics.track('invite_sent', {
  loopType,
  experimentId: decision.experimentId,
  variantId: decision.variantId,
});
```

---

### **Step 9: Feature Flags (15 min)**

Add experiment kill-switch

**Files to modify:**
- `app/src/config/featureFlags.ts`

**Changes:**
```typescript
export const GROWTH_FEATURE_FLAGS: GrowthFeatureFlags = {
  // ... existing flags
  experiments: {
    enabled: true, // ✅ Enable for PR17
  },
};
```

---

### **Step 10: Tests (2 hours)**

Unit and integration tests

**Files to create:**
- `functions/__tests__/experimentService.test.ts`
- `functions/__tests__/computeMetrics.test.ts`
- `functions/__tests__/guardrails.test.ts`

**Test cases:**
- Variant allocation is consistent
- K-factor computed correctly
- Guardrails trigger at thresholds
- Events tagged with experimentId/variantId

---

## 🗂️ Files to Create/Modify

### **Backend (Functions)**
```
functions/src/
├── growth/
│   ├── experimentService.ts           [NEW] – Variant allocation
│   ├── computeMetrics.ts              [NEW] – K-factor computation
│   ├── guardrails.ts                  [NEW] – Auto-pause logic
│   ├── experimentAdminApi.ts          [NEW] – Admin endpoints
│   ├── loopOrchestrator.ts            [MODIFY] – Add variant allocation
│   └── referralHandler.ts             [MODIFY] – Tag events
└── index.ts                           [MODIFY] – Export functions
```

### **Frontend (App)**
```
app/src/
├── types/
│   └── growthTypes.ts                 [MODIFY] – Add experiment types
├── services/growth/
│   ├── orchestratorService.ts         [MODIFY] – Pass experimentId
│   └── referralService.ts             [MODIFY] – Tag events
└── config/
    └── featureFlags.ts                [MODIFY] – Add experiments flag
```

### **Infrastructure**
```
firestore.rules                        [MODIFY] – Experiment security
firestore.indexes.json                 [MODIFY] – Query indexes
```

---

## 📊 Firestore Collections

### **Collection: `/experiments/{experimentId}`**
```
{
  experimentId: string,
  name: string,
  loopType: string,
  status: 'draft' | 'active' | 'paused' | 'completed',
  variants: Variant[],
  guardrails: Guardrails,
  startDate: Timestamp,
  endDate?: Timestamp,
  createdAt: Timestamp,
  createdBy: string
}
```

### **Collection: `/experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}`**
```
{
  date: Timestamp,
  kFactor: number,
  stats: {
    users: number,
    invites: number,
    joins: number,
    invitesPerUser: number,
    joinsPerInvite: number
  }
}
```

### **Collection: `/experiment_events/{eventId}`**
```
{
  eventId: string,
  eventType: string,
  userId: string,
  loopType: string,
  experimentId: string,
  variantId: string,
  timestamp: Timestamp,
  metadata?: any
}
```

---

## 🚀 Deployment Steps

1. **Deploy Firestore rules & indexes**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

2. **Deploy Cloud Functions**
   ```bash
   firebase deploy --only functions:computeKFactor,functions:checkGuardrails,functions:listExperiments,functions:getExperiment,functions:createExperiment,functions:updateExperiment,functions:getKFactor,functions:getOrchestratorDecision
   ```

3. **Enable feature flag**
   - Update `app/src/config/featureFlags.ts`
   - Set `experiments.enabled: true`

4. **Create first experiment**
   ```typescript
   await createExperiment({
     name: 'Tutor Card Copy Test',
     loopType: 'tutor_card',
     variants: [
       { variantId: 'control', name: 'Original Copy', allocationPct: 50 },
       { variantId: 'variant_a', name: 'New Copy', allocationPct: 50 },
     ],
     guardrails: {
       maxSpamRate: 0.005,
       maxOptOutRate: 0.01,
       maxCostMultiplier: 1.2,
     },
   });
   ```

---

## 🧪 Testing Strategy

### **Unit Tests**
- Variant allocation (same user → same variant)
- K-factor calculation (with mock data)
- Guardrail triggers (at exact thresholds)

### **Integration Tests**
- End-to-end: Create experiment → allocate users → log events → compute K
- Guardrail: Trigger spam threshold → verify auto-pause
- Admin API: Query K-factor for date range

### **Manual Tests**
1. Create experiment via admin API
2. Trigger orchestrator → verify variantId in response
3. Send invite → verify experimentId in referral doc
4. Wait 24h → verify K-factor computed
5. Trigger guardrail → verify auto-pause

---

## ✅ Definition of Done

- [ ] Experiments can be created/updated via admin API
- [ ] Variant allocation is consistent (tested with 1000 users)
- [ ] K-factor computed daily (scheduled job runs)
- [ ] Guardrails auto-pause experiments (tested manually)
- [ ] All events tagged with experimentId/variantId
- [ ] Admin can query K-factor via API
- [ ] 80% test coverage

---

## 🔗 Next Steps

After PR17:
- **PR17.5** – Personalization Agent (persona-specific copy per variant)
- **PR18** – Tutor Card Generator (first viral surface with A/B testing)
- **PR29** – Growth Ops Dashboard (visualize experiment results)

---

**Estimated Time:** 3-5 days  
**Next PR:** PR29 (Growth Ops Dashboard) or PR18 (Tutor Cards)

