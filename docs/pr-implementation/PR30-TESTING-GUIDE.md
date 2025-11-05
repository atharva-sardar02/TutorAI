# PR30: Parent-Child Challenge - Testing Guide

**Feature:** Parent-Child Challenge (Beat-My-Skill)  
**Status:** Ready for Testing  
**Test Environment:** Development + Staging

---

## 🎯 Test Overview

This guide covers testing the parent-child challenge feature, which extends PR23's Study Buddy Challenge to support parent-initiated challenges for their children.

**Core Functionality:**
- Parents can create 5-question challenges
- Children receive and complete challenges
- Only parents receive XP rewards (not children)
- Parent-specific messaging throughout UI

---

## ✅ Prerequisites

### Test Accounts Required
1. **Parent Account**
   - Role: `parent`
   - Has at least one child linked
   
2. **Child Account** (or use tutor account as child)
   - Can receive and complete challenges
   - No specific role requirement

### Environment Setup
- [ ] Firebase Functions deployed with PR30 changes
- [ ] App built with PR30 frontend changes
- [ ] Feature flag `parentChildChallenge.enabled` set to `true`
- [ ] Feature flag `studyBuddy.enabled` set to `true`

### Firestore Data
- [ ] Parent account exists in `/users` collection
- [ ] Parent has `userType: 'parent'` field
- [ ] Balances collection exists for tracking XP

---

## 📋 Test Scenarios

### Test 1: Parent Creates Challenge

**Objective:** Verify parents can create challenges with parent-specific UI

**Steps:**
1. Sign in as **parent account**
2. Navigate to app (Overview screen or session detail)
3. Trigger challenge creation (button/modal)
4. Observe modal UI

**Expected Results:**
- ✅ Modal title: "Challenge Your Child! 👨‍👩‍👧‍👦"
- ✅ Subtitle: "Create a fun [Subject] practice challenge for your child"
- ✅ Emoji shows family icon (👨‍👩‍👧‍👦) not target icon (🎯)
- ✅ "Create Challenge" button works
- ✅ Challenge created in <500ms

**Verify in Firestore:**
```
/challenges/{challengeId}
  creatorRole: "parent"
  challengeType: "parent_child"
  creatorId: <parent-uid>
  status: "pending"
```

---

### Test 2: Parent Shares Challenge

**Objective:** Verify parent-specific share messaging

**Steps:**
1. Continue from Test 1 (challenge created)
2. Tap "Send Challenge" button
3. Observe native share sheet

**Expected Results:**
- ✅ Share title: "Parent-Child Challenge"
- ✅ Share message: "👨‍👩‍👧‍👦 Time for a fun challenge! Let's practice [topic] together..."
- ✅ Message includes share URL
- ✅ Success alert: "Your child will love practicing with you!"

**Verify:**
- Copy share URL
- URL format: `https://messageai.app/studyBuddy?challengeId={id}&ref={referralId}`

---

### Test 3: Child Joins Challenge

**Objective:** Verify children can join parent-created challenges

**Steps:**
1. Open share URL from Test 2 on **child account** device
2. App deep links to challenge screen
3. Tap "Start Challenge"

**Expected Results:**
- ✅ Challenge screen loads with 5 questions
- ✅ Questions are from parent's selected subject
- ✅ Progress bar shows 0/5
- ✅ Can select answers and navigate

**Verify in Firestore:**
```
/challenges/{challengeId}
  participantId: <child-uid>
  status: "active"
  joinedAt: <timestamp>
```

---

### Test 4: Child Completes Challenge

**Objective:** Verify challenge grading and reward issuance

**Steps:**
1. Continue from Test 3
2. Answer all 5 questions
3. Tap "Submit"
4. Observe results screen

**Expected Results:**
- ✅ Results show score (e.g., "80% - 4/5 correct")
- ✅ No reward message for child (child doesn't earn XP)
- ✅ "Challenge Complete!" confirmation

**Verify in Firestore:**
```
/challenges/{challengeId}
  status: "completed"
  participantScore: <calculated-score>
  completedAt: <timestamp>

/rewards/<parent-uid>/grants
  - New document with:
    loopType: "studyBuddy"
    xp: 50
    reason: "parent_child_challenge_completed"

/balances/<parent-uid>
  xp: <incremented-by-50>

// Child should NOT have new reward document
/rewards/<child-uid>/grants
  - No new document for this challenge
```

---

### Test 5: Parent Receives XP (Not Child)

**Objective:** Verify only parent earns XP

**Steps:**
1. Check **parent account** balance before challenge
2. Complete Test 4 (child completes challenge)
3. Check **parent account** balance after
4. Check **child account** balance after

**Expected Results:**
- ✅ Parent XP balance increased by +50
- ✅ Child XP balance unchanged
- ✅ Parent sees notification (if implemented)

**Verify:**
- Parent: `/balances/{parent-uid}` → XP increased
- Child: `/balances/{child-uid}` → XP unchanged

---

### Test 6: Student-to-Student Challenge Still Works

**Objective:** Verify PR23 student challenges unaffected

**Steps:**
1. Sign in as **student/tutor account** (not parent)
2. Create a challenge (same flow as Test 1)
3. Share with another student
4. Second student completes challenge

**Expected Results:**
- ✅ Modal title: "Challenge a Friend! 🎯"
- ✅ Share message: "Beat my score!"
- ✅ **Both users** receive +50 XP + Streak Shield
- ✅ creatorRole: "student" (not "parent")

**Verify:**
- Both users have new reward documents
- Both balances incremented by 50 XP

---

### Test 7: 48h Cooldown Enforcement

**Objective:** Verify spam prevention

**Steps:**
1. Create challenge as parent (any subject, e.g., Math)
2. Child completes challenge
3. Immediately try to create another Math challenge

**Expected Results:**
- ✅ Challenge creation blocked
- ✅ Error message: "Cooldown active (~48h remaining)"
- ✅ Can create challenge for different subject

**Verify in Firestore:**
```
/cooldowns/<parent-uid>/loops/studyBuddy_Math
  lastCreatedAt: <timestamp>
  loopType: "studyBuddy"
  subject: "Math"
```

---

### Test 8: Challenge Expiration

**Objective:** Verify 7-day expiration

**Steps:**
1. Create challenge as parent
2. Query Firestore for `expiresAt` field
3. Try to join challenge after expiration (manual time adjustment or wait)

**Expected Results:**
- ✅ `expiresAt` is 7 days after `createdAt`
- ✅ Expired challenges show "Challenge has expired" error
- ✅ Cannot join expired challenge

---

### Test 9: Parent Notification

**Objective:** Verify parent sees correct notification

**Steps:**
1. Create challenge as parent
2. Check notifications collection
3. Child completes challenge
4. Check for completion notification

**Expected Results:**
- ✅ Creation notification title: "Challenge Your Child! 👨‍👩‍👧‍👦"
- ✅ Notification body: "Challenge your child to practice [subject] together"
- ✅ (Optional) Completion notification when child finishes

**Verify:**
```
/notifications
  - Document with:
    userId: <parent-uid>
    title: "Challenge Your Child! 👨‍👩‍👧‍👦"
    data.type: "study_buddy"
```

---

### Test 10: Feature Flag Toggle

**Objective:** Verify feature can be disabled

**Steps:**
1. Set `parentChildChallenge.enabled` to `false` in Firestore flags
2. Wait 60 seconds (cache refresh)
3. Try to create challenge as parent

**Expected Results:**
- ✅ Feature disabled (no UI changes or errors)
- ✅ Existing challenges still work
- ✅ Re-enabling flag restores functionality

---

## 🐛 Known Issues / Edge Cases

### Issue 1: Parent with No Children
**Scenario:** Parent account not linked to any child accounts  
**Expected:** Can still create challenges (system doesn't validate parent-child relationship)  
**Status:** ✅ By design - parent shares link manually

### Issue 2: Child Already Has Account
**Scenario:** Child clicks parent's link but already has app installed  
**Expected:** Deep link opens app, challenge loads  
**Status:** ✅ Referral attribution tracks via link

### Issue 3: Multiple Parents
**Scenario:** Child has two parent accounts  
**Expected:** Both parents can create challenges independently  
**Status:** ✅ Each parent has separate cooldowns

---

## 📊 Manual Verification Checklist

### Backend
- [ ] Challenge document created with correct fields
- [ ] creatorRole set to 'parent' or 'student'
- [ ] challengeType set to 'parent_child' or 'student_student'
- [ ] Rewards issued to correct users
- [ ] Cooldowns enforced per subject
- [ ] Referral attribution tracked

### Frontend
- [ ] Parent sees family emoji (👨‍👩‍👧‍👦)
- [ ] Student sees target emoji (🎯)
- [ ] Modal titles correct for each role
- [ ] Share messages correct for each role
- [ ] Success alerts correct for each role

### Integration
- [ ] Deep links work (challenge URL → app → challenge screen)
- [ ] Notifications display correctly
- [ ] XP balances update correctly
- [ ] Feature flag toggle works

---

## 🔍 Debugging Tips

### Challenge Not Created
1. Check Firestore `/challenges` collection
2. Check Cloud Functions logs: `firebase functions:log --only createStudyBuddyChallenge`
3. Verify user has `userType` field in `/users`

### Wrong Messaging (Parent Sees Student UI)
1. Check `user.userType` value in app
2. Verify `useAuth()` hook returns correct user object
3. Check `isParent` boolean calculation in modal

### Rewards Not Issued
1. Check `/rewards/{uid}/grants` collections
2. Check Cloud Functions logs: `firebase functions:log --only submitStudyBuddyChallenge`
3. Verify `awardChallengeRewards()` received correct `creatorRole`

### Feature Flag Not Working
1. Verify Firestore `/feature_flags/parentChildChallenge` exists
2. Check `enabled: true`
3. Wait 60 seconds for cache refresh
4. Check app config: `featureFlags.ts` includes flag

---

## ✅ Test Completion Criteria

**All tests pass when:**
- [ ] Parent can create challenges with correct UI
- [ ] Child can complete parent's challenges
- [ ] Only parent receives XP rewards
- [ ] Student challenges still reward both users
- [ ] 48h cooldown enforced
- [ ] Challenges expire after 7 days
- [ ] Feature flag toggle works
- [ ] No console errors or crashes

---

## 📝 Test Results Template

```markdown
## PR30 Test Results

**Tester:** [Your Name]  
**Date:** [Test Date]  
**Environment:** [Dev/Staging/Prod]

| Test | Status | Notes |
|------|--------|-------|
| 1. Parent Creates Challenge | ⏳ | |
| 2. Parent Shares Challenge | ⏳ | |
| 3. Child Joins Challenge | ⏳ | |
| 4. Child Completes Challenge | ⏳ | |
| 5. Parent Receives XP | ⏳ | |
| 6. Student Challenge Works | ⏳ | |
| 7. Cooldown Enforcement | ⏳ | |
| 8. Challenge Expiration | ⏳ | |
| 9. Parent Notification | ⏳ | |
| 10. Feature Flag Toggle | ⏳ | |

**Overall Status:** ⏳ In Progress / ✅ Pass / ❌ Fail

**Issues Found:** [List any bugs or unexpected behavior]

**Recommendations:** [Any suggestions for improvement]
```

---

**Created:** November 5, 2025  
**Last Updated:** November 5, 2025  
**Status:** Ready for Testing

