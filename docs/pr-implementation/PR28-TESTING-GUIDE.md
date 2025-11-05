# PR28 – MCP Contracts + Rationale Logging
**Manual Testing Guide**

---

## 🎯 What We're Testing

PR28 adds agent logging infrastructure that:
- Automatically logs every agent decision (orchestrator, incentives, etc.)
- Persists decision rationale, features used, and latency
- Redacts PII from all logs
- Provides admin replay endpoint for debugging

---

## ✅ Prerequisites

1. **Deployment complete:**
   - Firestore rules deployed
   - Firestore indexes deployed
   - Cloud Functions deployed (`getOrchestratorDecision`, `getAgentReplay`)

2. **Test user:**
   - Logged in as Tutor (T1)
   - Has completed at least 1 session

3. **Admin user:**
   - User with `admin: true` custom claim (for replay testing)

---

## 🧪 Test Scenarios

### **Test 1: Orchestrator Logging**

**Goal:** Verify that orchestrator decisions are logged

**Steps:**
1. Open MessageAI app
2. Click "Test PR16 Orchestrator" button on overview screen
3. Wait for success message
4. Open Firebase Console → Firestore
5. Navigate to `/agent_logs/{your_user_id}/decisions`

**Expected:**
- New document created with:
  - `agentName: 'orchestrator'`
  - `operation: 'decide'`
  - `rationale: "Eligible: tutor_card, variant: control"` (or similar)
  - `featuresUsed: ['role', 'sessions', 'rating', 'cooldown']`
  - `latency: <number in milliseconds>`
  - `timestamp: <Firestore timestamp>`
  - `loopType: 'tutor_card'` (or similar)

**Pass Criteria:**
- ✅ Log document exists
- ✅ All required fields present
- ✅ Rationale ≤240 characters
- ✅ No PII in rationale (no email, phone, full name)

---

### **Test 2: Latency Tracking**

**Goal:** Verify latency is tracked correctly

**Steps:**
1. Click "Test PR16 Orchestrator" 3 times
2. Check Firestore `/agent_logs/{your_user_id}/decisions`
3. Compare `latency` values across 3 logs

**Expected:**
- All logs have `latency` field
- Latency values are reasonable (50-300ms typically)
- Latency increases if Firestore is slow

**Pass Criteria:**
- ✅ Latency field present in all logs
- ✅ Values are positive integers

---

### **Test 3: PII Redaction**

**Goal:** Verify PII is removed from logs

**Steps:**
1. Create a test with PII in context:
   ```typescript
   // In app/app/(tabs)/index.tsx
   const testWithPII = async () => {
     const result = await getOrchestratorDecision({
       userRole: 'tutor',
       sessionContext: {
         studentName: 'John Smith',
         email: 'john@example.com',
         phone: '555-123-4567',
       },
     });
   };
   ```
2. Trigger the test
3. Check Firestore log entry

**Expected:**
- Input context should have PII redacted:
  - Email → `[EMAIL]`
  - Phone → `[PHONE]`
  - Name → `[NAME]`

**Pass Criteria:**
- ✅ No raw email addresses in logs
- ✅ No raw phone numbers in logs
- ✅ No full names in logs

---

### **Test 4: Admin Replay Endpoint**

**Goal:** Verify admins can query user logs

**Prerequisites:**
- You need a Firebase user with `admin: true` custom claim
- Set custom claim via Firebase Console or:
  ```bash
  firebase auth:set-custom-user-claims {USER_EMAIL} '{"admin":true}'
  ```

**Steps:**
1. Create a test script (or use Firebase Console):
   ```typescript
   import { httpsCallable } from 'firebase/functions';
   import { functions } from '@/lib/firebase';

   const replay = async () => {
     const getAgentReplayFn = httpsCallable(functions, 'getAgentReplay');
     const result = await getAgentReplayFn({
       targetUserId: 'USER_ID_TO_QUERY',
       agentName: 'orchestrator', // optional
       loopType: 'tutor_card',    // optional
       limit: 10,
     });
     console.log(result.data);
   };
   ```

2. Run as admin user
3. Check response

**Expected:**
```json
{
  "success": true,
  "userId": "USER_ID",
  "logs": [
    {
      "logId": "log_...",
      "agentName": "orchestrator",
      "operation": "decide",
      "rationale": "Eligible: tutor_card, variant: control",
      "latency": 123,
      "timestamp": { "_seconds": 1234567890, "_nanoseconds": 0 }
    }
  ],
  "count": 1,
  "filters": {
    "agentName": "orchestrator",
    "operation": "all",
    "loopType": "tutor_card"
  }
}
```

**Pass Criteria:**
- ✅ Admin can query any user's logs
- ✅ Non-admin gets `permission-denied` error
- ✅ Filters work correctly
- ✅ Response includes all expected fields

---

### **Test 5: Rationale Truncation**

**Goal:** Verify rationale is truncated to 240 characters

**Steps:**
1. Manually trigger a decision with a very long rationale (>240 chars)
2. Check Firestore log

**Expected:**
- Rationale is truncated to 240 characters
- Last 3 characters are `...`

**Pass Criteria:**
- ✅ All rationales ≤240 characters

---

### **Test 6: Error Logging**

**Goal:** Verify errors are logged

**Steps:**
1. Temporarily break the orchestrator (e.g., invalid user data)
2. Trigger orchestrator decision
3. Check Firestore for error log

**Expected:**
- Error logged with:
  - `output: { error: "Error message" }`
  - `rationale: "Error: ..."`
  - `metadata: { failed: true }`

**Pass Criteria:**
- ✅ Error logs created
- ✅ Error details redacted (no stack traces with file paths)

---

## 📊 Manual Test Report Template

```
PR28 — MCP Contracts + Rationale Logging
Environment: Production (messageai-88921)
Date: 2025-11-04
Tester: [Your name]

Test 1: Orchestrator Logging
Status: ✅ PASS / ❌ FAIL
Notes: [Any observations]
Artifact: Firestore screenshot

Test 2: Latency Tracking
Status: ✅ PASS / ❌ FAIL
Notes: [Latency values observed]
Artifact: N/A

Test 3: PII Redaction
Status: ✅ PASS / ❌ FAIL
Notes: [PII patterns tested]
Artifact: Log screenshot

Test 4: Admin Replay
Status: ✅ PASS / ❌ FAIL
Notes: [Admin query results]
Artifact: API response JSON

Test 5: Rationale Truncation
Status: ✅ PASS / ❌ FAIL
Notes: [Max length observed]
Artifact: N/A

Test 6: Error Logging
Status: ✅ PASS / ❌ FAIL
Notes: [Error scenario tested]
Artifact: Error log screenshot

Overall: ✅ PASS / ❌ FAIL
Rollback needed: YES / NO
```

---

## 🔄 Rollback (if needed)

If critical issues found:

1. **Disable logging feature flag** (future):
   ```typescript
   // In firestore: /feature_flags/mcp
   { enabled: false }
   ```

2. **Revert orchestrator**:
   ```bash
   git revert HEAD
   cd functions && pnpm run build
   firebase deploy --only functions:getOrchestratorDecision
   ```

---

## 🎯 Success Criteria (All must pass)

- ✅ All orchestrator decisions logged
- ✅ Latency tracked accurately
- ✅ Zero PII in logs
- ✅ Admin replay works
- ✅ Rationale ≤240 chars
- ✅ Errors logged gracefully
- ✅ No performance degradation (orchestrator still <150ms P95)

---

**Ready for production:** YES / NO

**Approved by:** _______________

**Date:** _______________

