# PR25 – Testing Guide
**Manual Testing Instructions**

---

## ✅ Deployment Complete

- [x] Firestore rules & indexes deployed
- [x] reward_policy document created
- [x] 4 Cloud Functions deployed
- [x] Test button added to app

---

## 🧪 Manual Testing Steps

### **Test 1: Issue Reward (Basic)**

1. **Open app** → Navigate to Overview screen (Home tab)
2. **Click "💰 Test PR25 Rewards"** button
3. **Expected Result:**
   ```
   Rewards Test ✅
   Success: true
   Reward: 110 xp
   Rationale: Granted 110 xp for tutor_card
   
   💰 XP Balance: 110
   🎟️ Class Passes: 0
   🛡️ Streak Shields: 0
   ```

4. **Verify in Firestore Console:**
   - `/rewards/{yourUserId}/grants/` → Should have 1 document
   - `/balances/{yourUserId}` → Should show `xpBalance: 110`
   - `/rewards_audit_log/` → Should have 1 log entry with action: "grant"

---

### **Test 2: Idempotency (Duplicate Prevention)**

1. **Click "💰 Test PR25 Rewards" again** (2nd time)
2. **Expected Result:**
   ```
   Rewards Test ✅
   Success: true
   Reward: 110 xp
   Rationale: Already granted (idempotent)
   
   💰 XP Balance: 110  ← Still 110, NOT 220!
   ```

3. **Verify in Firestore:**
   - `/rewards/{yourUserId}/grants/` → Still only 1 document
   - `/balances/{yourUserId}` → Still `xpBalance: 110`

✅ **Pass Criteria:** Balance does NOT double (idempotency works)

---

### **Test 3: Daily Cap Enforcement**

1. **Click button 10 times** (reach daily limit)
2. **On 11th click**, Expected Result:
   ```
   Rewards Test ❌
   Success: false
   Rationale: Daily reward limit reached (10/day)
   ```

3. **Verify in Firestore:**
   - `/rewards/{yourUserId}/grants/` → Should have 10 documents (not 11)
   - `/balances/{yourUserId}` → Balance stopped incrementing

✅ **Pass Criteria:** 11th reward is rejected

---

### **Test 4: Subject-Specific Bonuses**

**Math Tutor (default test):**
- Math tutors get **110 XP** (+10% bonus)

**To test Science bonus:**
1. Modify test button code:
   ```typescript
   subject: 'science' // +5% bonus
   ```
2. Expected: **105 XP**

**To test default (no bonus):**
1. Modify test button code:
   ```typescript
   subject: 'english' // No bonus
   ```
2. Expected: **100 XP**

---

### **Test 5: Different Loop Types**

**Change `loopType` in test button:**

| loopType       | Tutor Reward     | Expected |
|----------------|------------------|----------|
| `tutor_card`   | 100-110 XP       | ✅       |
| `progress_reel`| 1 Class Pass     | ✅       |
| `study_buddy`  | 50 XP            | ✅       |
| `tutor_peer`   | 200 XP           | ✅       |

**To test Class Pass:**
```typescript
const issueResult = await issueReward('progress_reel', {
  rating: 5.0,
  sessionCount: 10,
});
```

Expected:
```
Reward: 1 class_pass
🎟️ Class Passes: 1
```

---

### **Test 6: Balance Retrieval**

1. After issuing rewards, **restart the app**
2. **Click button** → Should show accumulated balance
3. Balance should persist across app restarts

✅ **Pass Criteria:** Balance is accurate after restart

---

### **Test 7: Audit Trail**

1. **Open Firestore Console** → `/rewards_audit_log/`
2. **Verify each grant is logged:**
   - `userId`: Your user ID
   - `action`: "grant"
   - `rewardType`: "xp" or "class_pass"
   - `amount`: Correct amount
   - `loopType`: Correct loop
   - `timestamp`: Recent timestamp

✅ **Pass Criteria:** 100% of actions are logged

---

## 🔍 Firestore Verification Checklist

### **Collections to Check:**

#### 1. `/rewards/{userId}/grants/{rewardId}`
```
✅ rewardId: "rwd_1730..."
✅ userId: "your-uid"
✅ type: "xp"
✅ amount: 110
✅ loopType: "tutor_card"
✅ requestKey: "req_1730..."
✅ grantedAt: Timestamp
✅ expiresAt: null (XP doesn't expire)
✅ clawedBack: false
✅ metadata: { rating: 5, sessionCount: 10, subject: "math", persona: "tutor" }
```

#### 2. `/balances/{userId}`
```
✅ userId: "your-uid"
✅ xpBalance: 110
✅ classPassCount: 0
✅ streakShieldCount: 0
✅ badgeCount: 0
✅ updatedAt: Timestamp
```

#### 3. `/rewards_audit_log/{logId}`
```
✅ userId: "your-uid"
✅ action: "grant"
✅ rewardType: "xp"
✅ amount: 110
✅ loopType: "tutor_card"
✅ timestamp: Timestamp
✅ metadata: { rewardId: "rwd_...", requestKey: "req_..." }
```

---

## 🎯 Success Criteria Summary

| Test                  | Pass Criteria                                    | Status |
|-----------------------|--------------------------------------------------|--------|
| Issue Reward          | 110 XP granted successfully                     | ⏳      |
| Idempotency           | 2nd click doesn't double balance                | ⏳      |
| Daily Cap             | 11th reward rejected                            | ⏳      |
| Balance Persistence   | Balance survives app restart                    | ⏳      |
| Audit Trail           | All actions logged to `/rewards_audit_log/`     | ⏳      |
| Firestore Structure   | All 3 collections populated correctly           | ⏳      |

---

## 🐛 Troubleshooting

### **"Error: Authentication required"**
→ Make sure you're logged in as a tutor

### **"Error: Failed to issue reward"**
→ Check Cloud Functions logs in Firebase Console

### **Balance shows 0 after reward**
→ Check `/balances/{userId}` in Firestore
→ May need to reload the app

### **No documents in /rewards/**
→ Check Cloud Functions logs for errors
→ Verify functions deployed successfully

---

## 📊 What to Look For

### **Console Logs (in Metro/Xcode):**
```
💰 Testing reward system...
✅ Reward issued: { success: true, reward: { type: 'xp', amount: 110, ... } }
📊 Balance: { xpBalance: 110, classPassCount: 0, ... }
```

### **Cloud Functions Logs (Firebase Console):**
```
✅ Reward granted { userId: "abc...", rewardId: "rwd_...", type: "xp", amount: 110, loopType: "tutor_card" }
```

---

## 🎉 When All Tests Pass

You're ready to:
1. ✅ Mark PR25 as complete
2. ✅ Move to PR32 (Feature Kills)
3. ✅ Integrate rewards with PR18 (Tutor Cards)

---

**Happy Testing!** 🚀

