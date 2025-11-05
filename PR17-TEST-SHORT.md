# PR17 – Quick Test (5 min)

## 🧪 Test: Variant Allocation Works

### **Step 1: Check Orchestrator Response**
Click "Test PR16 Orchestrator" button in your app

**Expected Response:**
```json
{
  "shouldShow": false,
  "experimentId": "default",
  "variantId": "control",
  "rationale": "All eligible loops on cooldown"
}
```

✅ **Pass if:** You see `experimentId` and `variantId` fields

---

### **Step 2: Check Event Logged**
Go to Firestore Console → Search for collection: `experiment_events`

**Expected:**
- Collection exists (might be empty if no events yet, that's okay)

✅ **Pass if:** Collection created

---

### **Step 3: Check Scheduled Jobs Deployed**
Go to Cloud Console → Cloud Scheduler:
https://console.cloud.google.com/cloudscheduler?project=messageai-88921

**Expected:**
- Job: `computeKFactor` (schedule: every day 02:00)
- Job: `checkGuardrails` (schedule: every 1 hours)

✅ **Pass if:** Both jobs exist

---

## ✅ All 3 Pass = PR17 Working!

**Next:** Create your first experiment when you implement PR18 (Tutor Cards)

---

## 🎯 Full Test (Later)

When you have actual viral loops (PR18, PR19):
1. Create experiment via admin API
2. Activate it
3. Test variant allocation with 2-3 users
4. Wait 24h for K-factor computation
5. Check metrics in Firestore

See `PR17-TESTING-GUIDE.md` for details.

