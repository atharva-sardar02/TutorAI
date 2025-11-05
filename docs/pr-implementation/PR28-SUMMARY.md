# PR28 – MCP Contracts + Rationale Logging
**Implementation Summary**

---

## ✅ Completed

All features from the implementation plan have been deployed:

1. **MCP Schema Types** – Standard agent communication format
2. **Agent Logger Middleware** – Automatic logging wrapper for all agents
3. **PII Redaction** – Removes sensitive data from logs
4. **Orchestrator Integration** – Orchestrator now logs all decisions
5. **Admin Replay Endpoint** – Query/debug user agent logs
6. **Firestore Rules & Indexes** – Security and query optimization

---

## 📁 Files Created

### **Backend (Functions)**
- `functions/src/types/mcpTypes.ts` – MCP schema definitions
- `functions/src/utils/agentLogger.ts` – Agent logging middleware
- `functions/src/ai/piiRedaction.ts` – PII removal utility
- `functions/src/growth/agentReplay.ts` – Admin replay endpoint

### **Frontend (App)**
- Updated `app/src/types/growthTypes.ts` – Added MCP types

### **Infrastructure**
- Updated `firestore.rules` – Security for `/agent_logs`
- Updated `firestore.indexes.json` – Indexes for agent log queries

---

## 📋 Files Modified

### **Backend**
- `functions/src/growth/loopOrchestrator.ts` – Wrapped with `logAgentCall`
- `functions/src/index.ts` – Exported `getAgentReplay`

---

## 🎯 Key Features

### **1. Automatic Agent Logging**

Every agent call is automatically logged:
```typescript
const decision = await logAgentCall(
  'orchestrator',
  'decide',
  { userRole, sessionContext },
  async () => {
    // Agent logic here
    return result;
  },
  userId,
  ['role', 'sessions', 'cooldown']
);
```

**Persisted to:** `/agent_logs/{userId}/decisions/{logId}`

---

### **2. MCP Message Format**

Standard schema for all agents:
```typescript
{
  agentName: 'orchestrator',
  operation: 'decide',
  input: { userRole, sessionContext },
  output: { shouldShow, loopType, rationale },
  rationale: "Eligible: tutor_card, variant: control",
  featuresUsed: ['role', 'sessions', 'cooldown'],
  latency: 123,
  timestamp: Timestamp
}
```

---

### **3. PII Redaction**

All logs are automatically sanitized:
- Email → `[EMAIL]`
- Phone → `[PHONE]`
- Names → `[NAME]`
- Credit cards → `[CARD]`
- SSNs → `[SSN]`

**Implementation:** `redactPII()` applied to all text fields

---

### **4. Admin Replay Endpoint**

Admins can query user logs:
```typescript
const logs = await getAgentReplay({
  targetUserId: 'user123',
  agentName: 'orchestrator',
  loopType: 'tutor_card',
  limit: 50
});
```

**Use cases:**
- Debug: "Why didn't user X see a prompt?"
- Analytics: "What features drove decision Y?"
- Compliance: "What data was used in decision Z?"

---

### **5. Performance Monitoring**

Every log includes latency:
```typescript
{
  latency: 123, // milliseconds
  featuresUsed: ['role', 'sessions', 'cooldown']
}
```

**Use cases:**
- Identify slow agent calls
- Optimize feature lookups
- Set SLO alerts

---

## 📊 Firestore Schema

### **Collection: `/agent_logs/{userId}/decisions/{logId}`**

```typescript
{
  logId: string,              // e.g., "log_1699920000000_a1b2c3d4"
  agentName: AgentName,       // 'orchestrator' | 'incentives' | ...
  operation: OperationType,   // 'decide' | 'issue_reward' | ...
  input: object,              // Sanitized input
  output: object,             // Sanitized output
  rationale: string,          // ≤240 chars, PII-free
  featuresUsed: string[],     // ['role', 'sessions', ...]
  latency: number,            // milliseconds
  timestamp: Timestamp,
  loopType?: string,          // Optional: which loop
  experimentId?: string,      // Optional: A/B test
  variantId?: string          // Optional: variant
}
```

**Indexes:**
- `(agentName, timestamp DESC)` – Query by agent
- `(loopType, timestamp DESC)` – Query by loop
- `(operation, timestamp DESC)` – Query by operation

---

## 🔒 Security

### **Firestore Rules**

```firestore
// Users can read their own logs
match /agent_logs/{userId}/decisions/{logId} {
  allow read: if request.auth.uid == userId;
  allow write: if false; // Only Cloud Functions
}

// Admins can read all logs
match /agent_logs/{userId}/decisions/{logId} {
  allow read: if request.auth.token.admin == true;
}
```

---

## 🧪 Testing

See `PR28-TESTING-GUIDE.md` for full manual test plan.

**Quick smoke test:**
1. Click "Test PR16 Orchestrator" button
2. Check `/agent_logs/{your_user_id}/decisions` in Firestore
3. Verify log entry exists with all fields

---

## 📈 Next Steps

### **Integrate Other Agents**

Wrap remaining agents with `logAgentCall`:

#### **PR25 – Incentives Agent**
```typescript
// In functions/src/growth/incentivesAgent.ts
import { logAgentCall } from '../utils/agentLogger';

const reward = await logAgentCall(
  'incentives',
  'issue_reward',
  { loopType, context },
  async () => {
    // Reward logic
    return result;
  },
  userId,
  ['persona', 'subject', 'daily_cap']
);
```

#### **PR17 – Experimentation Agent**
```typescript
const variant = await logAgentCall(
  'experimentation',
  'allocate_variant',
  { experimentId, userId },
  async () => {
    // Variant allocation
    return result;
  },
  userId,
  ['hash', 'allocation_pct']
);
```

#### **PR22 – Fraud Detection**
```typescript
const fraudCheck = await logAgentCall(
  'fraud',
  'check_fraud',
  { userId, action },
  async () => {
    // Fraud scoring
    return result;
  },
  userId,
  ['velocity', 'anomaly_score']
);
```

---

### **Growth Ops Dashboard (PR29)**

Use agent logs to power:
- Decision traces (visualize full agent chain)
- Feature importance (which features used most?)
- Latency monitoring (P50/P95/P99 by agent)
- Error rates (% failed agent calls)

---

### **Compliance (PR31)**

Agent logs are part of DSR (Data Subject Request):
- Export: Include all logs in user export
- Delete: Purge logs when user requests deletion
- Audit: Logs show what data was used in decisions

---

## 🎉 Impact

### **For Engineers**
- **Debugging:** Full trace of why user saw/didn't see prompt
- **Performance:** Identify slow agents
- **Testing:** Verify agent decisions in staging

### **For Product**
- **Analytics:** Which features drive conversions?
- **Experiments:** Compare agent behavior across variants
- **Insights:** User journey through viral loops

### **For Compliance**
- **Transparency:** Explain decisions to users
- **Auditability:** Full record of data usage
- **Privacy:** PII-free logs by default

---

## 🚀 Deployment Status

- ✅ Firestore rules deployed
- ✅ Firestore indexes deployed
- ✅ Cloud Functions deployed:
  - `getOrchestratorDecision` (updated)
  - `getAgentReplay` (new)
- ⏳ Manual testing in progress

---

## 🔗 Related PRs

- **PR16 (Orchestrator)** – First agent to use logging
- **PR25 (Incentives)** – Next agent to integrate
- **PR29 (Dashboard)** – Will consume logs for visualization
- **PR31 (Compliance)** – Will use logs for DSR

---

**Status:** ✅ **DEPLOYED** – Ready for testing

**Next PR:** PR17 (Experimentation Framework) or PR18 (Tutor Cards)

