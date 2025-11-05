# PR17 – Experimentation Framework
**Implementation Summary**

---

## ✅ Completed

All features from the implementation plan have been deployed:

1. **Experiment Schema & Types** – Firestore collections with security rules
2. **Variant Allocation** – Consistent hashing for stable A/B assignments
3. **Event Logging** – Growth events tracked for K-factor computation
4. **K-Factor Computation** – Scheduled daily job at 2am UTC
5. **Guardrails** – Hourly checks with auto-pause on threshold breach
6. **Admin API Endpoints** – Create, list, and update experiments
7. **Orchestrator Integration** – All decisions tagged with experimentId/variantId

---

## 📁 Files Created

### **Backend (Functions)**
- `functions/src/growth/experimentService.ts` – Variant allocation & admin APIs
- `functions/src/growth/computeMetrics.ts` – K-factor computation (scheduled)
- `functions/src/growth/guardrails.ts` – Auto-pause logic (scheduled)

### **Frontend (App)**
- Updated `app/src/types/growthTypes.ts` – Experiment types

### **Infrastructure**
- Updated `firestore.rules` – Security for experiments
- Updated `firestore.indexes.json` – Query indexes

---

## 📋 Files Modified

### **Backend**
- `functions/src/growth/loopOrchestrator.ts` – Integrated variant allocation
- `functions/src/index.ts` – Exported experiment functions

### **Frontend**
- `app/src/config/featureFlags.ts` – Enabled experiments flag

---

## 🎯 Key Features

### **1. Consistent Variant Allocation**

Users are deterministically assigned to variants using MD5 hashing:

```typescript
// Same user always gets same variant
const { experimentId, variantId } = await getUserVariant(userId, loopType);

// Hash userId + experimentId → 0-99 bucket → map to variant allocation %
```

**Example:**
- Experiment: 50% Control, 50% Variant A
- User "abc123" → hash → bucket 42 → Control
- User "xyz789" → hash → bucket 67 → Variant A

---

### **2. K-Factor Computation**

Scheduled daily at 2am UTC:

```
K = (invites per user) × (joins per invite)
```

**Computed metrics:**
- Users exposed to variant
- Invites sent
- Joins completed
- Invites per user
- Joins per invite
- **K-factor** (viral coefficient)

**Stored at:** `/experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}`

---

### **3. Guardrails (Auto-Pause)**

Checked every hour:

- **Spam rate >0.5%** → Pause experiment
- **Opt-out rate >1%** → Pause experiment
- **Cost multiplier >1.2x** → Pause experiment

When breached:
1. Experiment status → `paused`
2. `pausedReason` field set
3. Admins alerted (via Cloud Functions logs for MVP)

---

### **4. Growth Event Logging**

All viral actions logged to `/experiment_events`:

- `loop_exposed` – User saw a prompt
- `invite_sent` – User sent an invite
- `invite_opened` – Invitee clicked link
- `join_completed` – Invitee signed up
- `fvm_reached` – Invitee reached first value moment

Each event tagged with `experimentId` and `variantId`.

---

### **5. Admin API Endpoints**

**Create Experiment:**
```typescript
await createExperiment({
  name: 'Tutor Card Copy Test',
  loopType: 'tutor_card',
  variants: [
    { variantId: 'control', name: 'Original', allocationPct: 50 },
    { variantId: 'variant_a', name: 'New Copy', allocationPct: 50 },
  ],
  guardrails: {
    maxSpamRate: 0.005,
    maxOptOutRate: 0.01,
    maxCostMultiplier: 1.2,
  },
});
```

**List Experiments:**
```typescript
const { experiments } = await listExperiments();
```

**Update Experiment:**
```typescript
await updateExperiment({
  experimentId: 'exp_123',
  status: 'paused',
  pausedReason: 'Manual pause for review',
});
```

---

## 📊 Firestore Schema

### **Collection: `/experiments/{experimentId}`**
```typescript
{
  experimentId: string,
  name: string,
  description: string,
  loopType: string,
  status: 'draft' | 'active' | 'paused' | 'completed',
  variants: [
    { variantId: string, name: string, allocationPct: number }
  ],
  guardrails: {
    maxSpamRate: number,
    maxOptOutRate: number,
    maxCostMultiplier: number
  },
  startDate: Timestamp,
  endDate?: Timestamp,
  createdAt: Timestamp,
  createdBy: string,
  pausedReason?: string
}
```

### **Collection: `/experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}`**
```typescript
{
  date: Timestamp,
  experimentId: string,
  variantId: string,
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
```typescript
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

## 🔒 Security

### **Firestore Rules**

```firestore
// Anyone can read experiments (for variant allocation)
match /experiments/{experimentId} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.admin == true;
}

// Anyone can read metrics
match /experiment_metrics/{experimentId}/variants/{variantId}/daily/{date} {
  allow read: if request.auth != null;
  allow write: if false; // Only Cloud Functions
}

// Only admins can read events
match /experiment_events/{eventId} {
  allow read: if request.auth.token.admin == true;
  allow write: if false; // Only Cloud Functions
}
```

---

## 🚀 Deployed Functions

### **Callable Functions (HTTPS)**
- ✅ `listExperiments` – Get all experiments
- ✅ `createExperiment` – Create new experiment (admin only)
- ✅ `updateExperiment` – Update experiment status (admin only)
- ✅ `getOrchestratorDecision` – Updated with variant allocation

### **Scheduled Functions**
- ✅ `computeKFactor` – Runs daily at 2am UTC
- ✅ `checkGuardrails` – Runs hourly

---

## 🧪 Testing

See `PR17-TESTING-GUIDE.md` for detailed manual tests.

**Quick smoke test:**
1. Create an experiment via admin API
2. Trigger orchestrator → verify `experimentId` and `variantId` in response
3. Check Firestore `/experiment_events` → verify event logged
4. Wait 24h → check `/experiment_metrics` → verify K-factor computed

---

## 📈 Next Steps

### **Immediate (Before Launch)**
1. **Create first experiment** for Tutor Card loop
2. **Test variant allocation** with multiple users
3. **Monitor scheduled jobs** (check logs at 2am UTC)

### **Future PRs**
- **PR17.5** – Personalization Agent (use variant metadata for copy)
- **PR18** – Tutor Card Generator (first viral surface with experiments)
- **PR29** – Growth Ops Dashboard (visualize K-factor trends)

---

## 🎉 Impact

### **For Engineers**
- **A/B testing** for all viral features
- **Automated metrics** (K-factor computed daily)
- **Safety guardrails** (auto-pause on abuse/cost)

### **For Product**
- **Data-driven decisions** on viral loop copy/design
- **Faster iteration** (change variant allocation without code)
- **Risk mitigation** (guardrails prevent runaway costs)

### **For Growth**
- **Identify winning variants** with statistical significance
- **Optimize K-factor** loop by loop
- **Compound gains** (improve each loop by 10-20%)

---

## 🔗 Related PRs

- **PR15 (Referral Attribution)** – Tracks joins for K-factor
- **PR16 (Orchestrator)** – Allocates variants to users
- **PR28 (MCP Logging)** – Logs experiment decisions
- **PR29 (Dashboard)** – Visualizes K-factor trends
- **PR32 (Feature Kills)** – Kill-switch for experiments

---

**Status:** ✅ **DEPLOYED** – Ready for use

**Next PR:** PR18 (Tutor Cards) or PR29 (Growth Ops Dashboard)

