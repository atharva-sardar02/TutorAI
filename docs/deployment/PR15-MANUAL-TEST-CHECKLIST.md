# PR15 Manual Test Checklist

## 🧪 Test Environment Setup

### Prerequisites
- [ ] Firebase emulator running (`firebase emulators:start`)
- [ ] Test accounts created:
  - [ ] Tutor (T1): `tutor1@test.com`
  - [ ] Parent (P1): `parent1@test.com`
  - [ ] New user (N1): For signup testing
- [ ] Devices:
  - [ ] iOS simulator or device
  - [ ] Android emulator or device
- [ ] Tools:
  - [ ] Firebase Console open (Firestore tab)
  - [ ] Cloud Functions logs open (`firebase functions:log`)

---

## ✅ Test Cases

### **Test 1: Link Generation (Backend)**

**Setup:**
- Sign in as Tutor (T1)

**Steps:**
1. Open app, navigate to share feature (future PR18)
2. Trigger `createReferralLink` function:
```javascript
// In app console or test script
import { createReferralLink } from '@/services/growth/referralService';

const result = await createReferralLink({
  loopType: 'tutor_card',
  targetType: 'parent',
  metadata: { channel: 'test' }
});

console.log('Link:', result.url);
console.log('ReferralID:', result.referralId);
```

**Expected Results:**
- [ ] Link generated in <100ms
- [ ] Link format: `https://messageai.app/r/ref_XXX?sig=YYY&loop=tutor_card`
- [ ] Firestore: `/referrals/{referralId}` created with status = `pending`
- [ ] Response includes: `{ referralId, url, provider: 'custom' }`

**Screenshot:** Link generation output + Firestore doc

---

### **Test 2: Link Click Tracking (Deep Link)**

**Setup:**
- Use link from Test 1

**Steps:**
1. Open link in mobile browser or SMS
2. App should launch (or redirect to install)
3. Check AsyncStorage for referral context
4. Check Firestore

**Expected Results:**
- [ ] App opens with deep link handler triggered
- [ ] Console log: `🔗 Deep link received: messageai://r/ref_XXX...`
- [ ] Console log: `💾 Referral context stored`
- [ ] Firestore: Referral status = `clicked`, `clickedAt` timestamp added
- [ ] Device hints stored (hashed): `deviceId`, `userAgent`, `platform`

**Screenshot:** Console logs + Firestore doc showing `clicked` status

---

### **Test 3: Install-Deferred Attribution (Cold Start)**

**Setup:**
- Fresh app install (delete app, reinstall)
- Use link from Test 1

**Steps:**
1. Click referral link BEFORE installing app
2. Redirect to app store → install app
3. Open app for first time
4. Check if context preserved

**Expected Results:**
- [ ] Link opens app store (iOS) or Play Store (Android)
- [ ] After install, app opens with referral context
- [ ] AsyncStorage contains: `{ referralId, loopType, signature, clickedAt }`
- [ ] Context expires after 30 days

**Note:** This tests cross-device tracking via platform APIs (iOS Universal Links, Android Install Referrer)

**Screenshot:** App store redirect + first launch logs

---

### **Test 4: Signup Attribution**

**Setup:**
- Use link from Test 1
- Have referral context stored (from Test 2 or Test 3)

**Steps:**
1. Complete signup flow as new user (N1)
2. Check Firestore after signup

**Expected Results:**
- [ ] User created: `/users/{N1_uid}`
- [ ] User doc includes:
  - [ ] `referralId: ref_XXX`
  - [ ] `referredBy: T1_uid`
  - [ ] `referralLoopType: tutor_card`
- [ ] Referral doc updated:
  - [ ] `status: signed_up`
  - [ ] `referredUserId: N1_uid`
  - [ ] `signedUpAt: <timestamp>`
- [ ] AsyncStorage cleared: Referral context removed

**Screenshot:** User doc + Referral doc showing `signed_up` status

---

### **Test 5: HMAC Signature Verification**

**Setup:**
- Generate a referral link

**Steps:**
1. Copy referral URL
2. Manually tamper with URL (change `referralId`)
3. Try to track click with tampered URL

**Expected Results:**
- [ ] Backend rejects tampered link
- [ ] Error: `Invalid signature`
- [ ] Firestore: `/attribution_failures` entry created
- [ ] Attribution failure doc includes:
  - [ ] `errorType: invalid_signature`
  - [ ] `referralId: <tampered_id>`
  - [ ] `timestamp`

**Screenshot:** Error message + Attribution failure doc

---

### **Test 6: Expired Link Handling**

**Setup:**
- Create referral with past expiration (for testing, modify `expiresAt` in Firestore)

**Steps:**
1. Try to click expired referral link
2. Check error handling

**Expected Results:**
- [ ] Backend rejects expired link
- [ ] Error: `Referral expired`
- [ ] Referral status updated to: `expired`
- [ ] User sees friendly error (future UX work)

**Screenshot:** Error log + Firestore status change

---

### **Test 7: Admin Debug Endpoint**

**Setup:**
- Have multiple referrals created (Test 1 repeated)
- Sign in as admin user (or use Postman with auth token)

**Steps:**
1. Call `getReferralChain` function:
```javascript
// Using Firebase SDK or Postman
const result = await getReferralChain({
  referrerId: 'T1_uid',
  limit: 10
});

console.log('Referrals:', result.referrals);
```

**Expected Results:**
- [ ] Returns list of referrals for T1
- [ ] Each referral includes: `referralId`, `status`, `loopType`, timestamps
- [ ] Results ordered by `createdAt` descending
- [ ] Limit enforced (max 50)

**Screenshot:** API response with referral list

---

### **Test 8: Attribution Chain (End-to-End)**

**Setup:**
- Fresh test flow

**Steps:**
1. T1 generates link → Check Firestore: `pending`
2. N1 clicks link → Check Firestore: `clicked`
3. N1 signs up → Check Firestore: `signed_up`
4. Verify attribution accuracy:
   - Click → Install → Open → Signup chain complete
   - All timestamps recorded

**Expected Results:**
- [ ] Complete attribution chain visible in Firestore
- [ ] Referral doc shows:
  ```javascript
  {
    referralId: 'ref_XXX',
    referrerId: 'T1_uid',
    referredUserId: 'N1_uid',
    status: 'signed_up',
    createdAt: <timestamp>,
    clickedAt: <timestamp>,
    signedUpAt: <timestamp>,
    deviceHints: { deviceId: '...', platform: 'ios', ... }
  }
  ```
- [ ] User doc shows:
  ```javascript
  {
    uid: 'N1_uid',
    referralId: 'ref_XXX',
    referredBy: 'T1_uid',
    referralLoopType: 'tutor_card'
  }
  ```

**Screenshot:** Complete referral doc + user doc

---

### **Test 9: Feature Flag Toggle**

**Setup:**
- App running with referral attribution enabled

**Steps:**
1. Set `GROWTH_FEATURE_FLAGS.referralAttribution.enabled = false`
2. Try to create referral link
3. Check behavior

**Expected Results:**
- [ ] Link creation disabled or returns error
- [ ] App handles gracefully (no crash)
- [ ] Alternative flow available (e.g., show "Coming soon")

**Screenshot:** Disabled state UI

---

### **Test 10: Share Link (Native Share Sheet)**

**Setup:**
- Generate referral link

**Steps:**
1. Call `shareReferralLink` function:
```javascript
const result = await shareReferralLink({
  url: 'https://messageai.app/r/ref_XXX...',
  title: 'Join me on MessageAI!',
  message: 'Check out my tutoring profile'
});

console.log('Shared:', result.shared, 'Channel:', result.channel);
```
2. Select share target (WhatsApp, SMS, etc.)

**Expected Results:**
- [ ] Native share sheet appears
- [ ] Link included in message
- [ ] Returns `{ shared: true, channel: 'whatsapp' }` (or selected channel)
- [ ] If dismissed, returns `{ shared: false }`

**Screenshot:** Share sheet UI

---

### **Test 11: Copy to Clipboard (Fallback)**

**Setup:**
- Generate referral link

**Steps:**
1. Call `copyReferralLink` function:
```javascript
const success = await copyReferralLink('https://messageai.app/r/ref_XXX...');
console.log('Copied:', success);
```
2. Paste in another app

**Expected Results:**
- [ ] Link copied to clipboard
- [ ] User sees success toast (future UX)
- [ ] Pasted link matches original

**Screenshot:** Success message

---

### **Test 12: Cross-Platform Deep Links**

#### **iOS Universal Links**
- [ ] Click link in Safari → App opens
- [ ] Click link in Messages → App opens
- [ ] Click link in Mail → App opens
- [ ] First install: Redirect to App Store

#### **Android App Links**
- [ ] Click link in Chrome → App opens
- [ ] Click link in Gmail → App opens
- [ ] Click link in SMS → App opens
- [ ] First install: Redirect to Play Store

**Expected Results:**
- [ ] All platforms handle deep links correctly
- [ ] No intermediate web page (direct app open)
- [ ] Fallback to web if app not installed

**Screenshot:** Deep link opening app on both platforms

---

### **Test 13: Performance (Latency)**

**Steps:**
1. Measure link generation time (10 iterations)
2. Measure click tracking time (10 iterations)
3. Calculate P95 latency

**Expected Results:**
- [ ] Link generation P95 <100ms
- [ ] Click tracking P95 <150ms
- [ ] No timeouts or errors

**Screenshot:** Performance metrics

---

### **Test 14: Error Handling & Fallbacks**

#### **Scenario A: Network Failure**
- [ ] Disable network → Try to create link
- [ ] App shows error, allows retry
- [ ] No crash

#### **Scenario B: Invalid Input**
- [ ] Try to create link with invalid `loopType`
- [ ] Error: `Invalid loopType`

#### **Scenario C: Missing Referral Context**
- [ ] Sign up without clicking any link
- [ ] No errors, signup completes normally
- [ ] User doc has no `referralId` field

**Expected Results:**
- [ ] All error cases handled gracefully
- [ ] User never blocked from core functionality
- [ ] Errors logged to `/attribution_failures`

**Screenshot:** Error messages + logs

---

## 📊 Acceptance Criteria Summary

After completing all tests, verify:

- [ ] **Attribution Accuracy:** ≥95% (click → signup chain complete)
- [ ] **Link Generation Latency:** P95 <100ms
- [ ] **HMAC Security:** Tampered links rejected 100%
- [ ] **Cross-Device Tracking:** iOS & Android both work
- [ ] **Zero PII in Links:** No names, emails, or sensitive data
- [ ] **Admin Debugging:** Referral chains queryable
- [ ] **Graceful Fallbacks:** Feature flag works, errors don't block users
- [ ] **Error Rate:** <1% of operations fail

---

## 🐛 Known Issues / Blockers

Document any issues found during testing:

| Issue | Severity | Workaround | Status |
|-------|----------|------------|--------|
| (Example) iOS Universal Links not working | High | Use custom scheme `messageai://` | Blocked |
| (Example) HMAC signature verification slow | Low | N/A | Tracking |

---

## ✅ Sign-Off

**Tester:** ___________________  
**Date:** ___________________  
**Environment:** Staging / Production  
**Result:** PASS / FAIL  

**Notes:**
- All critical tests passed ✅
- Attribution accuracy: XX%
- No blockers found
- Ready for production rollout

---

**Next Steps:**
- [ ] Deploy to staging
- [ ] Run tests again in staging
- [ ] Enable for 5% of users (canary)
- [ ] Monitor metrics for 48 hours
- [ ] Full rollout if metrics stable

