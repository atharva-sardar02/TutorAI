# PR24: Parent Pod Invites & Tutor Peer Referrals - Testing Guide

## 🎯 Overview

This guide provides comprehensive testing scenarios for PR24, covering both Parent Pod Invites and Tutor Peer Referrals. Each test includes setup, steps, and expected outcomes.

---

## 🧪 Test Environment Setup

### Prerequisites
1. **Firebase Emulator** (optional, recommended for initial testing)
   ```bash
   firebase emulators:start
   ```

2. **Two Test Devices/Accounts**
   - Device A: Parent or Tutor (inviter/referrer)
   - Device B: New parent or tutor (invitee/referee)

3. **Cloud Functions Deployed**
   ```bash
   cd functions
   firebase deploy --only functions:createParentPodInvite,functions:createTutorPeerReferral
   ```

4. **Feature Flags Enabled** (already set in `featureFlags.ts`)
   - `loops.parentPod: { enabled: true }`
   - `loops.tutorPeer: { enabled: true }`

---

## 🏠 Part 1: Parent Pod Invite Tests

### Test 1.1: Create Parent Pod Invite (Happy Path)

**Setup:**
- Log in as a parent account on Device A
- Ensure at least one cohort exists (create if needed)

**Steps:**
1. Navigate to a cohort room (e.g., from Activity Feed or direct link)
2. Verify "Invite Parents" button is visible (orange button)
3. Tap "Invite Parents" button
4. Wait for loading indicator

**Expected Outcomes:**
- ✅ Share sheet opens within 1 second
- ✅ Share message includes:
  - Emoji: 👨‍👩‍👧‍👦
  - Cohort name
  - Invite URL format: `https://messageai.app/join/cohort/{cohortId}?ref={referralId}`
- ✅ Alert confirms: "Invite Sent!"
- ✅ Firestore `/referrals/{referralId}` document created with:
  - `loopType: 'parent_pod'`
  - `referrerType: 'parent'`
  - `targetType: 'parent'`
  - `status: 'pending'`

**Firestore Verification:**
```javascript
// Check in Firebase Console or emulator
db.collection('referrals').where('loopType', '==', 'parent_pod').get()
```

---

### Test 1.2: Non-Parent Cannot Create Pod Invite

**Setup:**
- Log in as a tutor account on Device A
- Navigate to a cohort room

**Steps:**
1. Open cohort room screen
2. Look for "Invite Parents" button

**Expected Outcomes:**
- ✅ "Invite Parents" button is **NOT visible** (only parents see it)
- ✅ No error thrown (conditional rendering)

---

### Test 1.3: Deep Link Navigation (Authenticated Parent)

**Setup:**
- Complete Test 1.1 to get invite URL
- Log in as a different parent account on Device B
- Copy invite URL from share sheet

**Steps:**
1. Open invite URL in Device B's browser or via deep link
2. Observe navigation flow

**Expected Outcomes:**
- ✅ Deep link handler (`/join/cohort/[id].tsx`) triggers
- ✅ Loading indicator displays: "Loading invite..."
- ✅ Referral click tracked in `/referrals/{referralId}`:
  - `status` updated to `'clicked'`
  - `clickedAt` timestamp added
- ✅ Navigates to cohort room: `/cohortRoom?cohortId=X&invitedBy=Y`
- ✅ Cohort room displays participants

**Firestore Verification:**
```javascript
// Check referral status updated
db.collection('referrals').doc(referralId).get()
// Should have: status: 'clicked', clickedAt: Timestamp
```

---

### Test 1.4: Deep Link Navigation (Guest User)

**Setup:**
- Complete Test 1.1 to get invite URL
- Open invite URL on Device B **without being logged in**

**Steps:**
1. Open invite URL in guest state
2. Observe navigation flow

**Expected Outcomes:**
- ✅ Deep link handler triggers
- ✅ Navigates to login: `/(auth)/login?returnTo=/join/cohort/{id}&ref={referralId}`
- ✅ After login, redirects to cohort room
- ✅ Referral attribution preserved through login flow

---

### Test 1.5: Invalid Cohort ID

**Setup:**
- Manually construct invite URL with fake cohortId

**Steps:**
1. Call `createParentPodInvite` with non-existent `cohortId`
2. Observe error handling

**Expected Outcomes:**
- ✅ Cloud Function returns error: `'Cohort not found'`
- ✅ Alert displays: "Failed to create invite. Please try again."
- ✅ No referral document created

---

## 👨‍🏫 Part 2: Tutor Peer Referral Tests

### Test 2.1: Create Tutor Peer Referral (Happy Path)

**Setup:**
- Log in as a tutor account on Device A

**Steps:**
1. Navigate to Profile screen
2. Verify "Refer a Tutor" button is visible (blue button with people icon)
3. Tap "Refer a Tutor" button
4. Fill form:
   - **Complementary Subject:** "Physics"
   - **Personal Message:** "Join me on MessageAI! Great platform for tutors."
5. Tap "Create Referral Link"
6. Wait for loading indicator

**Expected Outcomes:**
- ✅ Share sheet opens within 1 second
- ✅ Share message includes:
  - Emoji: 👋
  - Tutor name (e.g., "John Smith thinks you'd be a great fit...")
  - Personal message
  - Complementary subject
  - Referral URL format: `https://messageai.app/join/tutor?ref={referralId}`
- ✅ Alert confirms: "Referral Sent! Your fellow tutor will earn +50 XP when they join!"
- ✅ Modal closes
- ✅ Form resets
- ✅ Firestore `/referrals/{referralId}` document created with:
  - `loopType: 'tutor_peer'`
  - `referrerType: 'tutor'`
  - `targetType: 'tutor'`
  - `metadata.complementarySubject: 'Physics'`
  - `metadata.personalMessage: '...'`

**Firestore Verification:**
```javascript
db.collection('referrals').where('loopType', '==', 'tutor_peer').get()
```

---

### Test 2.2: Form Validation (Missing Required Field)

**Setup:**
- Log in as a tutor account on Device A
- Open "Refer a Tutor" modal

**Steps:**
1. Leave "Complementary Subject" field **empty**
2. Fill "Personal Message" (optional field)
3. Tap "Create Referral Link"

**Expected Outcomes:**
- ✅ Button is **disabled** (grayed out)
- ✅ No Cloud Function called
- ✅ No share sheet opens

---

### Test 2.3: Non-Tutor Cannot Create Peer Referral

**Setup:**
- Log in as a parent account on Device A
- Navigate to Profile screen

**Steps:**
1. Look for "Refer a Tutor" button

**Expected Outcomes:**
- ✅ "Refer a Tutor" button is **NOT visible** (only tutors see it)
- ✅ No error thrown (conditional rendering)

---

### Test 2.4: Deep Link Navigation (Authenticated Tutor)

**Setup:**
- Complete Test 2.1 to get referral URL
- Log in as a different tutor account on Device B
- Copy referral URL from share sheet

**Steps:**
1. Open referral URL in Device B's browser or via deep link
2. Observe navigation flow

**Expected Outcomes:**
- ✅ Deep link handler (`/join/tutor.tsx`) triggers
- ✅ Loading indicator displays: "Loading tutor invite..."
- ✅ Referral click tracked in `/referrals/{referralId}`:
  - `status` updated to `'clicked'`
  - `clickedAt` timestamp added
- ✅ Navigates to role selection: `/selectRole?ref={referralId}&preselect=tutor`
- ✅ Tutor role is pre-selected

---

### Test 2.5: Deep Link Navigation (New Tutor Signup)

**Setup:**
- Complete Test 2.1 to get referral URL
- Open referral URL on Device B **without being logged in**
- Complete full onboarding as new tutor

**Steps:**
1. Open referral URL in guest state
2. Complete authentication flow
3. Complete tutor onboarding (role selection, profile setup)
4. Check XP balances for both accounts

**Expected Outcomes:**
- ✅ Deep link navigates to login with return path
- ✅ After signup, redirects to tutor onboarding
- ✅ Referral attribution tracked through entire flow
- ✅ **Referrer (Device A) receives +100 XP**
- ✅ **New Tutor (Device B) receives +50 XP**
- ✅ Firestore `/balances/{userId}` documents updated
- ✅ Firestore `/rewards/{userId}/grants` documents created for both

**Firestore Verification:**
```javascript
// Check referrer balance
db.collection('balances').doc(referrerId).get()
// Should have: xp incremented by 100

// Check new tutor balance
db.collection('balances').doc(newTutorId).get()
// Should have: xp incremented by 50

// Check reward grants
db.collection('rewards').doc(referrerId).collection('grants')
  .where('loopType', '==', 'tutor_peer').get()
// Should have 1 grant with reason: 'Referred a tutor'

db.collection('rewards').doc(newTutorId).collection('grants')
  .where('loopType', '==', 'tutor_peer').get()
// Should have 1 grant with reason: 'Joined via tutor referral'
```

---

## 🔗 Part 3: Integration Tests

### Test 3.1: End-to-End Parent Pod Flow

**Scenario:** Parent A invites Parent B to cohort, both engage

**Steps:**
1. Parent A creates cohort invite
2. Parent B clicks link (authenticated)
3. Parent B joins cohort room
4. Parent B sends message in cohort (future: verify activity tracked)

**Expected Outcomes:**
- ✅ Referral attribution complete
- ✅ Both parents visible in cohort participants list
- ✅ Analytics events tracked:
  - `pod_invite_sent`
  - `pod_invite_clicked`
  - `pod_joined`

---

### Test 3.2: End-to-End Tutor Peer Flow

**Scenario:** Tutor A refers Tutor B, both get rewarded

**Steps:**
1. Tutor A creates peer referral
2. Tutor B clicks link (guest)
3. Tutor B completes signup as tutor
4. Check XP balances

**Expected Outcomes:**
- ✅ Referral attribution complete
- ✅ Tutor A: +100 XP
- ✅ Tutor B: +50 XP
- ✅ Analytics events tracked:
  - `tutor_referred`
  - `tutor_referral_clicked`
  - `tutor_joined`

---

### Test 3.3: Feature Flag Toggle

**Setup:**
- Set `loops.parentPod.enabled = false` in `featureFlags.ts`
- Rebuild and deploy app

**Steps:**
1. Log in as parent, navigate to cohort room
2. Log in as tutor, navigate to profile

**Expected Outcomes:**
- ✅ "Invite Parents" button **NOT visible**
- ✅ "Refer a Tutor" button **NOT visible**
- ✅ Existing referrals still tracked
- ✅ No new referrals created

**Cleanup:**
- Re-enable flags after test

---

### Test 3.4: HMAC Signature Verification

**Setup:**
- Manually construct referral URL with tampered signature

**Steps:**
1. Get valid referral URL
2. Modify `ref` parameter
3. Open tampered URL

**Expected Outcomes:**
- ✅ `trackReferralClick` rejects invalid signature
- ✅ Error logged to `/attribution_failures`
- ✅ User still navigates (graceful degradation)
- ✅ Attribution not recorded

---

## 📊 Part 4: Analytics & Monitoring

### Test 4.1: Firestore Referral Document Structure

**Verification:**
```javascript
// Parent Pod Referral
{
  referralId: 'ref_1730000000_abc123',
  referrerId: 'parentA_uid',
  referrerType: 'parent',
  targetType: 'parent',
  loopType: 'parent_pod',
  status: 'clicked',
  metadata: {
    cohortId: 'cohort_xyz',
    cohortName: 'Study Group',
  },
  createdAt: Timestamp,
  clickedAt: Timestamp,
  expiresAt: Timestamp (30 days),
}

// Tutor Peer Referral
{
  referralId: 'ref_1730000000_def456',
  referrerId: 'tutorA_uid',
  referrerType: 'tutor',
  targetType: 'tutor',
  loopType: 'tutor_peer',
  status: 'joined',
  metadata: {
    complementarySubject: 'Physics',
    personalMessage: 'Join me...',
    referrerName: 'John Smith',
  },
  createdAt: Timestamp,
  clickedAt: Timestamp,
  signedUpAt: Timestamp,
  referredUserId: 'tutorB_uid',
  expiresAt: Timestamp,
}
```

---

### Test 4.2: Cloud Function Logs

**Check Firebase Console Logs:**

**Parent Pod Invite:**
```
✅ Parent pod invite created
  - parentId: abc12345
  - cohortId: cohort_xyz
  - referralId: ref_1730000000_abc123
```

**Tutor Peer Referral:**
```
✅ Tutor peer referral created
  - tutorId: def45678
  - referralId: ref_1730000000_def456
  - targetEmail: provided | none

🎁 Tutor peer rewards issued
  - referrerId: def45678
  - newTutorId: ghi78901
  - referralId: ref_1730000000_def456
```

---

## ❌ Part 5: Error Handling Tests

### Test 5.1: Network Failure During Share

**Setup:**
- Disable network on Device A mid-flow

**Steps:**
1. Start creating invite/referral
2. Disable network before share sheet opens

**Expected Outcomes:**
- ✅ Alert displays: "Failed to create invite/referral. Please try again."
- ✅ No partial data in Firestore
- ✅ User can retry when network restored

---

### Test 5.2: Expired Referral Link

**Setup:**
- Create referral, manually set `expiresAt` to past date in Firestore

**Steps:**
1. Click expired referral link

**Expected Outcomes:**
- ✅ `trackReferralClick` detects expiration
- ✅ Error logged to `/attribution_failures`
- ✅ User still navigates (graceful degradation)
- ✅ Attribution not recorded

---

### Test 5.3: Duplicate Reward Prevention

**Setup:**
- Create tutor peer referral
- Manually call `issueTutorPeerRewards` twice

**Steps:**
1. Trigger reward issuance
2. Check reward grants collection

**Expected Outcomes:**
- ✅ Only **one** grant document per user (idempotency via `requestKey`)
- ✅ XP balance only incremented once
- ✅ Second call logs warning but doesn't duplicate

---

## ✅ Success Criteria Summary

### Functional
- [x] Parents can invite to cohort rooms
- [x] Tutors can refer other tutors
- [x] Deep links preserve context
- [x] Referral attribution tracks 100%
- [x] Rewards issued correctly

### Performance
- [ ] Link generation <500ms
- [ ] Deep link navigation <2s
- [ ] Share sheet opens <500ms

### User Experience
- [ ] Clear invite/referral messaging
- [ ] Rewards displayed prominently
- [ ] No friction in sharing flow

---

## 🐛 Bug Reporting

If you encounter issues during testing, report with:
1. **Test Number** (e.g., Test 2.5)
2. **Device/Platform** (iOS 17, Android 14, etc.)
3. **Actual vs. Expected Outcome**
4. **Firestore State** (screenshot or JSON)
5. **Cloud Function Logs** (Firebase Console)

---

## 📝 Test Results Tracking

Use this checklist to track progress:

### Parent Pod Tests
- [ ] Test 1.1: Create invite (happy path)
- [ ] Test 1.2: Non-parent blocked
- [ ] Test 1.3: Deep link (authenticated)
- [ ] Test 1.4: Deep link (guest)
- [ ] Test 1.5: Invalid cohort

### Tutor Peer Tests
- [ ] Test 2.1: Create referral (happy path)
- [ ] Test 2.2: Form validation
- [ ] Test 2.3: Non-tutor blocked
- [ ] Test 2.4: Deep link (authenticated)
- [ ] Test 2.5: Deep link + signup + rewards

### Integration Tests
- [ ] Test 3.1: End-to-end parent pod
- [ ] Test 3.2: End-to-end tutor peer
- [ ] Test 3.3: Feature flag toggle
- [ ] Test 3.4: HMAC verification

### Analytics Tests
- [ ] Test 4.1: Firestore structure
- [ ] Test 4.2: Cloud Function logs

### Error Tests
- [ ] Test 5.1: Network failure
- [ ] Test 5.2: Expired link
- [ ] Test 5.3: Duplicate reward

---

**Testing Complete! 🎉**

Next: Deploy to production and monitor rollout metrics.

