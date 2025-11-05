# PR32 – Kill-Switch Testing Guide

---

## ✅ Prerequisites

- [x] Feature flags created in Firestore
- [x] Orchestrator function deployed
- [x] App running on device

---

## 🧪 Test Suite

### **Test 1: Master Kill-Switch**

**Purpose:** Verify master switch disables all growth features

**Steps:**
1. **Disable:**
   - Firestore → `/feature_flags/growth_master`
   - Set `enabled: false`

2. **Test:**
   - App → Click "🎯 Test PR16 Orchestrator"
   - **Expected:** "Throttled ⏸️" - "Orchestrator disabled via kill-switch"

3. **Re-enable:**
   - Set `enabled: true`
   - Wait 60 seconds (cache)
   - Test again → Should work

**✅ Pass Criteria:** Master switch controls all growth features

---

### **Test 2: Per-Feature Kill-Switch**

**Purpose:** Verify individual feature can be disabled

**Steps:**
1. **Ensure master is ON:**
   - `/feature_flags/growth_master` → `enabled: true`

2. **Disable orchestrator:**
   - `/feature_flags/orchestrator` → `enabled: false`

3. **Test:**
   - Should be throttled (even though master is ON)

4. **Re-enable:**
   - Set `enabled: true`

**✅ Pass Criteria:** Individual switches work independently

---

### **Test 3: Cache Behavior (60s TTL)**

**Purpose:** Verify 60-second cache works correctly

**Steps:**
1. **Baseline:**
   - All flags ON
   - Test orchestrator → Works

2. **Disable flag:**
   - Set `growth_master` → `false`

3. **Test immediately (< 60s):**
   - Should **STILL WORK** (cached value)

4. **Wait 60 seconds:**
   - Test again
   - Should **NOW BE THROTTLED** (cache expired)

5. **Re-enable:**
   - Set `enabled: true`
   - Wait 60s
   - Should work again

**✅ Pass Criteria:** 
- Flags cached for 60s
- Changes take effect after cache expires

---

### **Test 4: Gradual Rollout (Advanced)**

**Purpose:** Test percentage-based rollout

**Steps:**
1. **Set rollout to 0%:**
   - `/feature_flags/loop_tutor_card`
   - Set `rolloutPercent: 0`

2. **Test:**
   - Orchestrator should NOT show tutor_card
   - May show other loops (tutor_peer, results)

3. **Set rollout to 100%:**
   - Set `rolloutPercent: 100`
   - Wait 60s
   - tutor_card should be eligible again

**✅ Pass Criteria:** Rollout percentage controls loop eligibility

---

### **Test 5: Fail-Safe Behavior**

**Purpose:** Verify system fails open on flag read errors

**Steps:**
1. **Delete a flag (temporarily):**
   - Delete `/feature_flags/orchestrator` document

2. **Test:**
   - Should **STILL WORK** (fail-open behavior)
   - System assumes enabled if flag missing

3. **Restore flag:**
   - Re-create `orchestrator` document with `enabled: true`

**✅ Pass Criteria:** System fails open (stays operational) on flag errors

---

## 📊 Test Results Template

```
Test 1: Master Kill-Switch
Status: [ ] Pass [ ] Fail
Notes: 

Test 2: Per-Feature Kill-Switch
Status: [ ] Pass [ ] Fail
Notes:

Test 3: Cache Behavior
Status: [ ] Pass [ ] Fail
Notes:

Test 4: Gradual Rollout
Status: [ ] Pass [ ] Fail
Notes:

Test 5: Fail-Safe
Status: [ ] Pass [ ] Fail
Notes:
```

---

## 🔍 Verification Checklist

- [ ] Master switch disables everything
- [ ] Per-feature switches work independently
- [ ] Cache holds values for 60 seconds
- [ ] Changes take effect after cache expires
- [ ] Rollout percentages work
- [ ] System fails open on errors
- [ ] No user-visible error messages
- [ ] Cloud Functions logs show proper rationale

---

## 📝 Cloud Functions Logs

**To view logs:**
```bash
firebase functions:log --only getOrchestratorDecision --limit 20
```

**Look for:**
- `⏭️ Orchestrator disabled via kill-switch` (when disabled)
- `⚠️ Firestore unhealthy, using fallback` (if health check fails)

---

## 🐛 Troubleshooting

### **"Kill-switch not working"**
→ Wait 60 seconds for cache to expire

### **"Still seeing loops when disabled"**
→ Check both `growth_master` AND `orchestrator` flags

### **"No response from orchestrator"**
→ Check Cloud Functions logs for errors

---

## 🎯 Success Criteria

All tests pass AND:
- Toggle takes effect within 60s
- No crashes or errors
- Graceful fallback messages
- Logs show proper rationale

---

**Ready to test?** Start with Test 1 (Master Kill-Switch)! 🚀

