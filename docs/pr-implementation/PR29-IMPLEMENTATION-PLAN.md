# PR29 – Growth Ops Dashboard (Admin)
**Implementation Plan**

---

## 📋 Overview

**Goal:** Web admin dashboard for K-factor, funnels, fraud queue, experiment toggles, and kill-switches  
**Owner:** Engineer A (Backend) + TBD (Frontend)  
**Effort:** 6-10 days (Large)  
**Risk:** Low  
**Dependencies:** PR17 (experiments), PR22 (fraud), PR28 (agent logs)  
**Kill-Switch:** N/A (admin tool, always available)

---

## ✅ Acceptance Criteria

- [ ] K-factor metrics by loop/variant/date
- [ ] Funnel visualization (invite → open → join → FVM)
- [ ] D1/D7/D28 retention by cohort
- [ ] Fraud review queue with approve/reject
- [ ] Experiment toggles (on/off, adjust rollout %)
- [ ] Per-agent and per-loop kill-switches
- [ ] Audit trail for all admin actions
- [ ] Role-based access (Admin, Analyst, Support)
- [ ] All endpoints <500ms

---

## 🎨 Dashboard Architecture

### **Option A: Custom React Admin (Recommended)**
- **Pros:** Full control, can embed in existing admin panel
- **Cons:** More dev time (6-10 days)
- **Tech Stack:** React + Recharts + Firebase SDK

### **Option B: Retool (Faster MVP)**
- **Pros:** Faster to build (2-3 days), no frontend code
- **Cons:** Monthly cost ($50-200), less customization
- **Tech Stack:** Retool + Cloud Functions APIs

**Decision:** Start with **Option B (Retool)** for MVP, migrate to Option A later if needed.

---

## 📐 Step-by-Step Implementation

### **Phase 1: Backend APIs (4-5 days)**

---

### **Step 1: Metrics API – K-Factor (1 day)**

**Endpoint:** `GET /admin/metrics/k-factor`

**Query params:**
- `loopType` (optional)
- `experimentId` (optional)
- `variantId` (optional)
- `startDate` (ISO string)
- `endDate` (ISO string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-01",
      "loopType": "tutor_card",
      "experimentId": "exp_001",
      "variantId": "control",
      "kFactor": 1.25,
      "stats": {
        "users": 100,
        "invites": 150,
        "joins": 85,
        "invitesPerUser": 1.5,
        "joinsPerInvite": 0.57
      }
    }
  ]
}
```

**Files to create:**
- `functions/src/growth/adminApi.ts`

---

### **Step 2: Metrics API – Funnel (1 day)**

**Endpoint:** `GET /admin/metrics/funnel`

**Query params:**
- `loopType`
- `experimentId` (optional)
- `variantId` (optional)
- `startDate`
- `endDate`

**Response:**
```json
{
  "success": true,
  "funnel": [
    { "stage": "exposed", "count": 1000, "pct": 100 },
    { "stage": "invite_sent", "count": 400, "pct": 40 },
    { "stage": "invite_opened", "count": 200, "pct": 20 },
    { "stage": "join_completed", "count": 100, "pct": 10 },
    { "stage": "fvm_reached", "count": 80, "pct": 8 }
  ]
}
```

**Implementation:**
- Query `/experiment_events` collection
- Group by `eventType`, count distinct users
- Calculate conversion rates

---

### **Step 3: Metrics API – Retention (1 day)**

**Endpoint:** `GET /admin/metrics/retention`

**Query params:**
- `cohortDate` (ISO string) – Users who joined on this date
- `retentionDays` (comma-separated: "1,7,28")

**Response:**
```json
{
  "success": true,
  "cohortDate": "2025-11-01",
  "cohortSize": 100,
  "retention": [
    { "day": 1, "activeUsers": 85, "pct": 85 },
    { "day": 7, "activeUsers": 60, "pct": 60 },
    { "day": 28, "activeUsers": 40, "pct": 40 }
  ]
}
```

**Implementation:**
- Query `/users` where `createdAt` = cohortDate
- For each retention day, count users with activity on that day
- Activity = any message sent, session attended, or task completed

**Note:** For MVP, compute on-demand. Later, pre-compute via scheduled job.

---

### **Step 4: Fraud Review Queue (1 day)**

**Endpoint:** `GET /admin/fraud/queue`

**Query params:**
- `status` (optional: 'pending' | 'approved' | 'rejected')
- `minScore` (optional: min anomaly score, default 70)
- `limit` (default 50)

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "referralId": "ref_123",
      "userId": "user_456",
      "anomalyScore": 85,
      "reasons": ["velocity", "device_reuse"],
      "flaggedAt": "2025-11-04T10:00:00Z",
      "status": "pending"
    }
  ]
}
```

**Action endpoints:**
```typescript
// POST /admin/fraud/approve
{ referralId: string }

// POST /admin/fraud/reject
{ referralId: string, reason: string }

// POST /admin/fraud/ban
{ userId: string, reason: string }
```

**Files to modify:**
- `functions/src/growth/adminApi.ts`
- `firestore.rules` – Add rules for `/fraud_queue`

---

### **Step 5: Experiment Toggles (30 min)**

**Endpoints:**
```typescript
// GET /admin/experiments/list
// Returns: all experiments with status, dates, current K-factor

// POST /admin/experiments/{experimentId}/toggle
{
  enabled: boolean,
  rolloutPct?: number // Optional: adjust allocation
}
```

**Implementation:**
- Update experiment doc in Firestore
- Changes propagate within 60s (cached on client)

**Files to modify:**
- `functions/src/growth/experimentAdminApi.ts`

---

### **Step 6: Kill-Switch Panel (1 day)**

**Endpoints:**
```typescript
// GET /admin/killswitch/list
// Returns: all feature flags with current state

// POST /admin/killswitch/{target}
{
  enabled: boolean
}
// Target examples: 'orchestrator', 'incentives', 'tutor_card', 'progress_reel'
```

**Implementation:**
- Read/write to `/feature_flags` collection (PR32)
- Verify fallback behavior on disable (health check)

**Files to create:**
- `functions/src/growth/killswitchApi.ts`

**Fallback verification:**
```typescript
async function verifyFallback(target: string): Promise<boolean> {
  // Temporarily disable feature
  // Trigger orchestrator → should return fallback
  // Re-enable feature
  // Return true if fallback worked
}
```

---

### **Step 7: Audit Trail (30 min)**

Log all admin actions to Firestore

**Collection:** `/admin_audit_log/{logId}`

**Schema:**
```typescript
{
  logId: string,
  adminId: string,
  adminEmail: string,
  action: string, // 'pause_experiment', 'approve_fraud', 'disable_killswitch'
  target: string, // experimentId, referralId, featureName
  timestamp: Timestamp,
  metadata?: any  // Action-specific data
}
```

**Implementation:**
- Middleware function `logAdminAction()`
- Called in all admin endpoints

---

### **Step 8: Role-Based Access (1 day)**

Firebase custom claims for access control

**Roles:**
- **Admin** – Full access (all endpoints)
- **Analyst** – Read-only (metrics, funnels)
- **Support** – Fraud queue only

**Implementation:**
```typescript
// Set custom claims via Firebase Admin SDK
await admin.auth().setCustomUserClaims(uid, {
  role: 'admin' | 'analyst' | 'support'
});

// Verify in Cloud Functions
if (!request.auth.token.role || request.auth.token.role !== 'admin') {
  throw new HttpsError('permission-denied', 'Admin access required');
}
```

**Files to create:**
- `functions/src/utils/auth.ts`

---

### **Phase 2: Frontend Dashboard (3-5 days)**

---

### **Option B: Retool Dashboard (Faster MVP)**

**Steps:**
1. **Create Retool app** (30 min)
   - Sign up at retool.com
   - Create new app: "MessageAI Growth Ops"

2. **Connect to Firebase** (30 min)
   - Add Firebase resource (REST API)
   - Base URL: `https://us-central1-messageai-88921.cloudfunctions.net`
   - Auth: Firebase ID token (from admin user)

3. **Build K-Factor Chart** (1 hour)
   - Component: Line chart
   - Data source: Query `GET /admin/metrics/k-factor`
   - X-axis: Date
   - Y-axis: K-factor
   - Filter: Loop type dropdown

4. **Build Funnel Visualization** (1 hour)
   - Component: Funnel chart or Table
   - Data source: Query `GET /admin/metrics/funnel`
   - Show: Stage → Count → Conversion %

5. **Build Fraud Queue** (1.5 hours)
   - Component: Table
   - Data source: Query `GET /admin/fraud/queue`
   - Actions: Approve, Reject buttons (call admin API)
   - Refresh: Auto-refresh every 30s

6. **Build Experiment Toggles** (1 hour)
   - Component: Table + Toggle switches
   - Data source: Query `GET /admin/experiments/list`
   - Actions: Toggle on/off, adjust rollout %

7. **Build Kill-Switch Panel** (1 hour)
   - Component: Grid of toggle switches
   - Data source: Query `GET /admin/killswitch/list`
   - Actions: Enable/disable per feature

**Total Retool time:** ~5-6 hours

---

### **Option A: Custom React Admin (Full Control)**

**Tech Stack:**
- React + TypeScript
- Recharts (charts)
- Material-UI or Tailwind (UI)
- Firebase SDK (auth + data)

**Structure:**
```
admin-dashboard/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx       // Overview (K-factor, funnels)
│   │   ├── Experiments.tsx     // Experiment list + toggles
│   │   ├── FraudQueue.tsx      // Fraud review
│   │   ├── KillSwitches.tsx    // Feature flags
│   │   └── AuditLog.tsx        // Admin action history
│   ├── components/
│   │   ├── KFactorChart.tsx    // Line chart
│   │   ├── FunnelChart.tsx     // Funnel visualization
│   │   └── MetricCard.tsx      // Stat cards
│   ├── hooks/
│   │   ├── useMetrics.ts       // Fetch metrics
│   │   └── useAuth.ts          // Admin auth
│   └── lib/
│       └── firebase.ts         // Firebase config
├── package.json
└── README.md
```

**Time estimate:** 3-5 days

---

## 🗂️ Files to Create/Modify

### **Backend (Functions)**
```
functions/src/
├── growth/
│   ├── adminApi.ts                    [NEW] – Metrics endpoints
│   ├── experimentAdminApi.ts          [MODIFY] – Experiment toggles
│   ├── killswitchApi.ts               [NEW] – Kill-switch panel
│   └── computeMetrics.ts              [MODIFY] – Add retention calc
├── utils/
│   └── auth.ts                        [NEW] – Role-based access
└── index.ts                           [MODIFY] – Export admin functions
```

### **Frontend (Retool or React)**
```
// If Retool: No code, just UI builder
// If React: See structure above
```

### **Infrastructure**
```
firestore.rules                        [MODIFY] – Admin access rules
firestore.indexes.json                 [MODIFY] – Query indexes
```

---

## 📊 Firestore Collections

### **Collection: `/experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}`**
Used for K-factor charts (created by PR17)

### **Collection: `/fraud_queue/{referralId}`**
```
{
  referralId: string,
  userId: string,
  anomalyScore: number,
  reasons: string[],
  flaggedAt: Timestamp,
  status: 'pending' | 'approved' | 'rejected',
  reviewedBy?: string,
  reviewedAt?: Timestamp
}
```

### **Collection: `/admin_audit_log/{logId}`**
```
{
  logId: string,
  adminId: string,
  adminEmail: string,
  action: string,
  target: string,
  timestamp: Timestamp,
  metadata?: any
}
```

---

## 🚀 Deployment Steps

### **Backend Deployment**

1. **Deploy Firestore rules & indexes**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

2. **Deploy Cloud Functions**
   ```bash
   firebase deploy --only functions:getKFactor,functions:getFunnel,functions:getRetention,functions:getFraudQueue,functions:approveFraud,functions:rejectFraud,functions:listExperiments,functions:toggleExperiment,functions:listKillSwitches,functions:toggleKillSwitch
   ```

3. **Set admin custom claim**
   ```typescript
   // In Firebase console or via script
   await admin.auth().setCustomUserClaims('YOUR_ADMIN_UID', {
     admin: true,
     role: 'admin'
   });
   ```

### **Frontend Deployment (Retool)**

1. Create Retool account
2. Build dashboard (follow steps above)
3. Share URL with team
4. Set up SSO (optional)

### **Frontend Deployment (React)**

1. Build app: `npm run build`
2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting:admin
   ```
3. Access at: `https://messageai-88921.web.app/admin`

---

## 🧪 Testing Strategy

### **Backend API Tests**
- K-factor endpoint returns correct data
- Funnel endpoint calculates conversions
- Retention endpoint counts active users
- Fraud queue filters by score
- Experiment toggle propagates within 60s
- Kill-switch disables feature and verifies fallback
- Audit log captures all admin actions

### **Frontend Tests**
- Charts render with mock data
- Fraud queue approve/reject works
- Experiment toggle updates Firestore
- Kill-switch disables feature in <60s

### **Manual E2E Test**
1. Open admin dashboard
2. View K-factor chart → verify data for last 7 days
3. Open fraud queue → approve 1 item → verify status change
4. Toggle experiment off → verify orchestrator stops using it
5. Disable `tutor_card` kill-switch → verify fallback
6. Check audit log → verify all actions logged

---

## ✅ Definition of Done

- [ ] K-factor, funnel, retention endpoints deployed
- [ ] Fraud review queue functional (approve/reject)
- [ ] Experiment toggles work (<60s propagation)
- [ ] Kill-switch panel disables features
- [ ] Audit trail logs all admin actions
- [ ] Role-based access enforced (admin/analyst/support)
- [ ] Dashboard UI accessible (Retool or React)
- [ ] All endpoints <500ms
- [ ] Manual E2E test passes

---

## 🔗 Next Steps

After PR29:
- **PR22** – Fraud Detection (populate fraud queue)
- **PR31** – Compliance & DSR (audit log for compliance)
- **Launch** – Soft-launch viral growth (5% rollout)

---

**Estimated Time:**  
- **Backend:** 4-5 days
- **Frontend (Retool):** 5-6 hours  
- **Frontend (React):** 3-5 days  
- **Total (Retool MVP):** 5-6 days  
- **Total (React):** 7-10 days

**Recommendation:** Start with **Retool** for fast MVP, migrate to React later if needed.

---

**Next PR:** PR18 (Tutor Cards) or PR22 (Fraud Detection)

