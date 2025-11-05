# PR17 – Experimentation Framework
**Testing Guide**

---

## 🎯 What We're Testing

PR17 adds A/B testing infrastructure:
- Experiment creation and management
- Consistent variant allocation
- Growth event logging
- K-factor computation (scheduled)
- Guardrails (auto-pause)

---

## ✅ Prerequisites

1. **Deployment complete:**
   - Firestore rules and indexes deployed
   - Cloud Functions deployed:
     - `listExperiments`, `createExperiment`, `updateExperiment`
     - `getOrchestratorDecision` (updated)
     - `computeKFactor`, `checkGuardrails`

2. **Admin user:**
   - You need Firebase Admin SDK access or custom claim `admin: true`

3. **Test users:**
   - At least 3 test users (to verify consistent variant allocation)

---

## 🧪 Test Scenarios

### **Test 1: Create Experiment**

**Goal:** Verify experiment creation via admin API

**Steps:**
1. Use Firebase Console Functions tab or create a script:
   ```typescript
   import { httpsCallable } from 'firebase/functions';
   import { functions } from '@/lib/firebase';

   const createExp = async () => {
     const createExperimentFn = httpsCallable(functions, 'createExperiment');
     const result = await createExperimentFn({
       name: 'Tutor Card Copy Test',
       description: 'Test original vs new copy',
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
     console.log(result.data);
   };
   ```

2. Run the function
3. Check Firestore: `/experiments/{experimentId}`

**Expected:**
- Experiment created with status `draft`
- All fields present (name, loopType, variants, guardrails)
- `experimentId` returned in response

**Pass Criteria:**
- ✅ Experiment document exists in Firestore
- ✅ Variant allocations sum to 100%

---

### **Test 2: Activate Experiment**

**Goal:** Verify experiment can be activated

**Steps:**
1. Update the experiment created in Test 1:
   ```typescript
   const updateExp = async () => {
     const updateExperimentFn = httpsCallable(functions, 'updateExperiment');
     const result = await updateExperimentFn({
       experimentId: 'YOUR_EXPERIMENT_ID',
       status: 'active',
     });
     console.log(result.data);
   };
   ```

2. Check Firestore: `/experiments/{experimentId}`

**Expected:**
- Experiment status changed to `active`

**Pass Criteria:**
- ✅ Status field updated in Firestore

---

### **Test 3: Variant Allocation (Consistency)**

**Goal:** Verify same user always gets same variant

**Steps:**
1. Log in as Test User 1
2. Click "Test PR16 Orchestrator" button **3 times**
3. Check response: note the `experimentId` and `variantId`
4. Repeat for Test User 2 and Test User 3

**Expected:**
- Each user gets consistent variant across multiple calls
- Example:
  - User 1: Always gets `control`
  - User 2: Always gets `variant_a`
  - User 3: Always gets `control`
- Roughly 50/50 split across users (not exact for 3 users)

**Pass Criteria:**
- ✅ Same user always gets same variant
- ✅ Both variants assigned to at least one user

---

### **Test 4: Growth Event Logging**

**Goal:** Verify events are logged to Firestore

**Steps:**
1. Click "Test PR16 Orchestrator" button
2. Check Firestore: `/experiment_events`
3. Filter by your userId

**Expected:**
- New document created with:
  - `eventType: 'loop_exposed'`
  - `userId: YOUR_USER_ID`
  - `loopType: 'tutor_card'`
  - `experimentId: YOUR_EXPERIMENT_ID`
  - `variantId: 'control' or 'variant_a'`
  - `timestamp: <recent>`

**Pass Criteria:**
- ✅ Event document exists
- ✅ All fields populated correctly
- ✅ experimentId matches active experiment

---

### **Test 5: K-Factor Computation (Scheduled)**

**Goal:** Verify K-factor is computed daily

**Note:** This requires waiting 24+ hours for the scheduled job to run, OR manually triggering it.

**Manual Trigger (via Firebase Console):**
1. Go to: https://console.cloud.google.com/cloudscheduler
2. Find job: `computeKFactor`
3. Click "Force Run"
4. Wait 2-3 minutes

**Check Results:**
1. Go to Cloud Functions logs
2. Search for: `"K-factor computed"`
3. Check Firestore: `/experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}`

**Expected:**
- Log message: `✅ K-factor computed for exp_xxx / control: 0.00`
- Metrics document created with:
  - `kFactor: <number>`
  - `stats: { users, invites, joins, invitesPerUser, joinsPerInvite }`

**Pass Criteria:**
- ✅ Scheduled job runs without errors
- ✅ Metrics document created
- ✅ K-factor = 0 (since no actual invites/joins yet)

---

### **Test 6: Guardrails (Auto-Pause)**

**Goal:** Verify guardrails can pause an experiment

**Note:** This is hard to test without actual fraud. For MVP, just verify the scheduled job runs.

**Manual Trigger:**
1. Go to: https://console.cloud.google.com/cloudscheduler
2. Find job: `checkGuardrails`
3. Click "Force Run"
4. Wait 1-2 minutes

**Check Results:**
1. Go to Cloud Functions logs
2. Search for: `"Guardrail checks complete"`

**Expected:**
- Log message: `✅ Guardrail checks complete in XXXms`
- Log message: `✅ Guardrails passed for exp_xxx` (if no breach)

**Pass Criteria:**
- ✅ Scheduled job runs without errors
- ✅ No experiments paused (since no threshold breached)

---

### **Test 7: List Experiments (Admin API)**

**Goal:** Verify admin can query all experiments

**Steps:**
1. Call `listExperiments` function:
   ```typescript
   const listExp = async () => {
     const listExperimentsFn = httpsCallable(functions, 'listExperiments');
     const result = await listExperimentsFn();
     console.log(result.data);
   };
   ```

2. Check response

**Expected:**
```json
{
  "success": true,
  "experiments": [
    {
      "experimentId": "exp_xxx",
      "name": "Tutor Card Copy Test",
      "loopType": "tutor_card",
      "status": "active",
      "variants": [ ... ],
      "guardrails": { ... }
    }
  ],
  "count": 1
}
```

**Pass Criteria:**
- ✅ All experiments returned
- ✅ Response includes all fields

---

## 📊 Manual Test Report Template

```
PR17 — Experimentation Framework
Environment: Production (messageai-88921)
Date: 2025-11-04
Tester: [Your name]

Test 1: Create Experiment
Status: ✅ PASS / ❌ FAIL
Notes: [experimentId created]
Artifact: Firestore screenshot

Test 2: Activate Experiment
Status: ✅ PASS / ❌ FAIL
Notes: [Status changed to active]
Artifact: Firestore screenshot

Test 3: Variant Allocation
Status: ✅ PASS / ❌ FAIL
Notes: [User 1: control, User 2: variant_a, User 3: control]
Artifact: Console logs

Test 4: Event Logging
Status: ✅ PASS / ❌ FAIL
Notes: [Event logged with correct fields]
Artifact: Firestore screenshot

Test 5: K-Factor Computation
Status: ✅ PASS / ❌ FAIL / ⏳ PENDING (24h)
Notes: [Job ran, K-factor = 0]
Artifact: Cloud Functions logs + Firestore screenshot

Test 6: Guardrails
Status: ✅ PASS / ❌ FAIL
Notes: [Job ran, no breaches]
Artifact: Cloud Functions logs

Test 7: List Experiments
Status: ✅ PASS / ❌ FAIL
Notes: [All experiments returned]
Artifact: API response JSON

Overall: ✅ PASS / ❌ FAIL
Rollback needed: YES / NO
```

---

## 🔄 Rollback (if needed)

If critical issues found:

1. **Disable experiments feature flag:**
   ```typescript
   // In app/src/config/featureFlags.ts
   experiments: {
     enabled: false,
   },
   ```

2. **Pause all active experiments:**
   ```typescript
   await updateExperiment({
     experimentId: 'exp_xxx',
     status: 'paused',
     pausedReason: 'Production issue',
   });
   ```

3. **Revert orchestrator (if needed):**
   ```bash
   git revert HEAD
   cd functions && pnpm run build
   firebase deploy --only functions:getOrchestratorDecision
   ```

---

## 🎯 Success Criteria (All must pass)

- ✅ Experiments can be created and activated
- ✅ Variant allocation is consistent (same user → same variant)
- ✅ Growth events logged to Firestore
- ✅ K-factor computation scheduled job runs
- ✅ Guardrails scheduled job runs
- ✅ Admin can list/update experiments
- ✅ No performance degradation (orchestrator still <150ms)

---

**Ready for production:** YES / NO

**Approved by:** _______________

**Date:** _______________

