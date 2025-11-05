# PR28 – MCP Contracts + Rationale Logging
**Implementation Plan**

---

## 📋 Overview

**Goal:** Define MCP JSON schemas between agents; persist decision, features_used, rationale, latency to `/agent_logs`; add replay tooling  
**Owner:** Engineer A (Backend)  
**Effort:** 3-4 hours (Small)  
**Risk:** Low  
**Dependencies:** PR16 (orchestrator logging foundation)  
**Kill-Switch:** `growth.mcp.loggingEnabled`

---

## ✅ Acceptance Criteria

- [ ] All 5 agents have documented schemas
- [ ] 100% of agent calls logged
- [ ] Zero PII leaks
- [ ] Rationale ≤240 chars enforced
- [ ] Admins can trace any user's viral journey
- [ ] Replay endpoint works
- [ ] 80% test coverage

---

## 📐 Step-by-Step Implementation

### **Step 1: MCP Schema Types (30 min)**

Create `/agent_logs` schema and interfaces

**Files:**
- `app/src/types/growthTypes.ts` (add MCP types)
- `functions/src/types/mcpTypes.ts` (server types)

**Types to define:**
- `MCPMessage` - Standard agent communication format
- `AgentLog` - Persisted log entry
- `AgentName` - Union type of all agents
- `OperationType` - Common operations

---

### **Step 2: Agent Logger Middleware (1 hour)**

Create logging wrapper that:
- Auto-logs all agent calls
- Enforces rationale length
- Redacts PII
- Tracks latency

**Files:**
- `functions/src/utils/agentLogger.ts`

---

### **Step 3: PII Redaction (30 min)**

Reuse existing `piiRedaction.ts` or extend it

**Files:**
- `functions/src/ai/piiRedaction.ts` (already exists - extend)

---

### **Step 4: Update Orchestrator Logging (30 min)**

Replace manual logging with agentLogger middleware

**Files:**
- `functions/src/growth/loopOrchestrator.ts` (modify)

---

### **Step 5: Admin Replay Endpoint (1 hour)**

Create Cloud Function for querying logs

**Files:**
- `functions/src/growth/agentReplay.ts` (new)

---

### **Step 6: Firestore Rules & Indexes (15 min)**

Add rules for `/agent_logs`

**Files:**
- `firestore.rules` (modify)
- `firestore.indexes.json` (modify)

---

### **Step 7: Testing (30 min)**

Unit tests for logger and redaction

**Files:**
- `functions/__tests__/agentLogger.test.ts`

---

## 🗂️ Files to Create/Modify

### **Backend (Functions)**
```
functions/src/
├── types/
│   └── mcpTypes.ts              [NEW]
├── utils/
│   └── agentLogger.ts           [NEW]
├── ai/
│   └── piiRedaction.ts          [MODIFY]
├── growth/
│   ├── agentReplay.ts           [NEW]
│   └── loopOrchestrator.ts      [MODIFY]
└── index.ts                     [MODIFY]
```

### **Frontend (App)**
```
app/src/
└── types/
    └── growthTypes.ts           [MODIFY]
```

### **Infrastructure**
```
firestore.rules                  [MODIFY]
firestore.indexes.json           [MODIFY]
```

---

## 📊 MCP Schema Structure

### **Standard MCP Message**
```typescript
{
  agentName: 'orchestrator' | 'personalization' | 'incentives' | 'fraud' | 'experimentation',
  operation: 'decide' | 'personalize' | 'issue_reward' | 'check_fraud' | 'allocate_variant',
  input: { /* agent-specific input */ },
  output: { /* agent-specific output */ },
  rationale: string, // ≤240 chars
  featuresUsed: string[], // e.g., ['session_count', 'rating', 'cooldown']
  latency: number, // milliseconds
  timestamp: Timestamp,
  userId: string,
  metadata?: any
}
```

---

## 🎯 Agent-Specific Schemas

### **Orchestrator**
```typescript
{
  agentName: 'orchestrator',
  operation: 'decide',
  input: {
    userRole: string,
    sessionContext: object
  },
  output: {
    shouldShow: boolean,
    loopType?: string,
    rationale: string
  },
  featuresUsed: ['role', 'sessions', 'rating', 'cooldown'],
  latency: number
}
```

### **Incentives**
```typescript
{
  agentName: 'incentives',
  operation: 'issue_reward',
  input: {
    loopType: string,
    context: object
  },
  output: {
    success: boolean,
    reward: object,
    rationale: string
  },
  featuresUsed: ['persona', 'subject', 'daily_cap'],
  latency: number
}
```

---

## 🔒 PII Redaction Rules

**Always redact:**
- Names (first, last, full)
- Email addresses
- Phone numbers
- Addresses
- School names
- Student IDs

**Keep:**
- User IDs (hashed)
- Roles (tutor, parent, student)
- Subjects (math, science)
- Ratings (numerical)
- Session counts

---

## 🧪 Testing Strategy

### **Unit Tests:**
- Rationale truncation (>240 chars)
- PII redaction (100% on test set)
- Schema validation
- Latency tracking

### **Integration Tests:**
- End-to-end: orchestrator decision → log entry
- Replay: query by userId → get full trace
- PII audit: no PII in production logs

---

## 📝 Firestore Schema

### **Collection: `/agent_logs/{userId}/decisions/{logId}`**
```
{
  logId: string,
  agentName: string,
  operation: string,
  input: object,
  output: object,
  rationale: string, // ≤240 chars, PII-free
  featuresUsed: string[],
  latency: number,
  timestamp: Timestamp,
  loopType?: string,
  experimentId?: string,
  variantId?: string
}
```

---

## 🚀 Deployment Steps

1. **Deploy Firestore rules & indexes**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

2. **Deploy functions**
   ```bash
   firebase deploy --only functions:getOrchestratorDecision,functions:getAgentReplay
   ```

3. **Test logging**
   - Trigger orchestrator
   - Check `/agent_logs` in Firestore

---

## ✅ Definition of Done

- [ ] MCP schemas defined for 5 agents
- [ ] agentLogger middleware created
- [ ] PII redaction applied to all logs
- [ ] Orchestrator uses agentLogger
- [ ] Replay endpoint created
- [ ] Firestore rules deployed
- [ ] Manual testing: log entry created
- [ ] Manual testing: replay works
- [ ] No PII in logs verified

---

**Estimated Time:** 3-4 hours  
**Next PR:** PR17 (Experimentation) or PR18 (Tutor Cards)

