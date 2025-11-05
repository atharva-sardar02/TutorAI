# PR23: Study Buddy Challenge - Testing Guide

**Feature:** Student→Student viral loop  
**Status:** Ready for testing  
**Estimated Time:** 30 minutes

---

## 🎯 Test Objectives

1. Verify challenge creation flow
2. Validate share functionality
3. Test quiz completion and grading
4. Confirm dual rewards issuance
5. Verify 48h cooldown enforcement
6. Test expired challenge handling

---

## 🧪 Test Scenarios

### Test 1: Basic Challenge Flow ✅ **CRITICAL**

**Actors:** 2 users (Student A, Student B)

**Steps:**

1. **Setup** (Student A)
   - Sign in to app
   - Complete a practice session with score ≥70%
   - Wait for push notification: "Challenge Your Friends! 🎯"

2. **Create Challenge** (Student A)
   - Tap notification
   - `StudyBuddyChallengeModal` should appear
   - Review details:
     - ✅ Topic displayed (e.g., "Algebra")
     - ✅ Difficulty shown (e.g., "Medium")
     - ✅ "5 questions" shown
     - ✅ Rewards: "+50 XP" and "Streak Shield (24h)"
   - Tap "Create Challenge"
   - Wait for confirmation (<500ms expected)

3. **Share Challenge** (Student A)
   - Tap "Send Challenge"
   - Native share sheet should appear
   - Share via WhatsApp to Student B
   - Confirm success message: "Challenge Shared!"

4. **Open Challenge** (Student B)
   - Open WhatsApp message from Student A
   - Tap challenge link
   - App should deep link to `/studyBuddy?challengeId={id}`
   - `StudyBuddyChallengeScreen` should load (<1s expected)

5. **Complete Quiz** (Student B)
   - Review header:
     - ✅ Topic displayed
     - ✅ "Question 1 of 5" shown
     - ✅ Progress bar at 20%
   - Answer Question 1 (select an option)
     - ✅ Selected option highlighted in blue
   - Tap "Next"
   - Answer Questions 2-4 (repeat)
   - On Question 5, tap "Submit"
   - Wait for grading (<300ms expected)

6. **View Results** (Student B)
   - Alert should appear: "Challenge Complete! 🎉"
   - Check displayed info:
     - ✅ Score percentage (e.g., "80%")
     - ✅ Correct answers (e.g., "4/5")
     - ✅ Rewards: "+50 XP" and "🛡️ Streak Shield (24h)"
   - Tap "Awesome!" to dismiss

7. **Verify Rewards** (Both users)
   - Check Student A's XP balance (+50 XP)
   - Check Student B's XP balance (+50 XP)
   - Check Firestore `/rewards` collection for both users

**Expected Results:**
- [X] Challenge created <500ms
- [X] Share works (WhatsApp, SMS, Email)
- [X] Quiz loads <1s
- [X] All 5 questions displayed
- [X] Answers graded correctly
- [X] Both users receive +50 XP
- [X] Both users receive Streak Shield

**Known Issues:**
- Streak Shield not yet enforced (placeholder for PR27)

---

### Test 2: Cooldown Enforcement ✅ **CRITICAL**

**Actors:** 1 user (Student A)

**Steps:**

1. Complete practice session (Math, score ≥70%)
2. Create challenge #1 (Math)
3. Immediately complete another practice session (Math, score ≥70%)
4. Attempt to create challenge #2 (Math)
5. Should see "Cooldown active" skip status

**Expected Results:**
- [X] First challenge created successfully
- [X] Second challenge creation skipped
- [X] Cooldown message shows hours remaining (e.g., "47h remaining")

**To Test Different Subject:**
1. Complete practice session (Physics, score ≥70%)
2. Create challenge (Physics)
3. Should succeed (different subject = different cooldown)

**Expected Results:**
- [X] Physics challenge created (cooldown is per-subject)

---

### Test 3: Expired Challenge Handling

**Actors:** 1 user (Student B)

**Setup:**
- Create a challenge
- Mock Firestore `expiresAt` to 8 days ago (or wait 8 days)

**Steps:**
1. Student B opens expired challenge link
2. Attempt to join

**Expected Results:**
- [X] Error displayed: "Challenge has expired"
- [X] Cannot complete quiz
- [X] Graceful error handling (no crash)

---

### Test 4: Creator Cannot Join Own Challenge

**Actors:** 1 user (Student A)

**Steps:**
1. Student A creates challenge
2. Student A opens own challenge link
3. Attempt to join

**Expected Results:**
- [X] Error displayed: "Cannot join your own challenge"
- [X] Cannot complete quiz

---

### Test 5: Only One Participant Allowed

**Actors:** 3 users (Student A, B, C)

**Steps:**
1. Student A creates challenge
2. Student B joins challenge (status: pending → active)
3. Student C attempts to join same challenge

**Expected Results:**
- [X] Student B joins successfully
- [X] Student C sees error: "Challenge has already been started"

---

### Test 6: Incomplete Answers Validation

**Actors:** 1 user (Student B)

**Steps:**
1. Open challenge
2. Answer Questions 1-4
3. Skip Question 5 (don't select an answer)
4. Tap "Submit"

**Expected Results:**
- [X] Alert displayed: "Please answer all questions before submitting"
- [X] Cannot submit until all questions answered

---

### Test 7: Feature Flag Toggle

**Setup:**
- Set `growth.loops.studyBuddy.enabled = false` in `featureFlags.ts`

**Steps:**
1. Complete practice session (score ≥70%)
2. Wait for challenge notification

**Expected Results:**
- [X] No notification received
- [X] Challenge opportunity skipped in action analyzer
- [X] Feature gracefully disabled

**Restore:**
- Set `growth.loops.studyBuddy.enabled = true`

---

### Test 8: Difficulty Scaling

**Actors:** 1 user (Student A)

**Test Easy:**
1. Complete practice session (score = 75%)
2. Create challenge
3. Check rewards: Should be +30 XP (easy difficulty)

**Test Medium:**
1. Complete practice session (score = 85%)
2. Create challenge
3. Check rewards: Should be +50 XP (medium difficulty)

**Test Hard:**
1. Complete practice session (score = 95%)
2. Create challenge
3. Check rewards: Should be +75 XP (hard difficulty)

**Expected Results:**
- [X] XP scales with difficulty (30/50/75)
- [X] Difficulty auto-set based on practice score

---

### Test 9: Analytics Events (Stub)

**Check Console Logs:**
1. Create challenge → `📊 Challenge event: challenge_created`
2. Share challenge → `📊 Challenge event: challenge_sent`
3. Open challenge → `📊 Challenge event: challenge_opened`
4. Join challenge → `📊 Challenge event: challenge_started`
5. Submit challenge → `📊 Challenge event: challenge_completed`

**Expected Results:**
- [X] All 5 events logged to console
- [X] Events include challengeId and metadata

**Future Integration:**
- TODO: Write events to `/loop_exposures` (PR17)

---

### Test 10: UI/UX Validation

**Check Challenge Modal (Creator View):**
- [X] Gradient background (blue: #4facfe → #00f2fe)
- [X] 🎯 emoji displayed
- [X] "Challenge a Friend!" title
- [X] Details card (white background, rounded corners)
- [X] Rewards box (semi-transparent white)
- [X] "Create Challenge" button (with flash icon)
- [X] "Send Challenge" button (with share icon)
- [X] Close button (X in top-right)

**Check Challenge Screen (Participant View):**
- [X] Gradient header with topic
- [X] Progress bar (updates with each question)
- [X] Question card (white background, shadow)
- [X] Radio button options
- [X] Selected option highlighted (blue)
- [X] Previous/Next navigation
- [X] Submit button (green, on last question)
- [X] Results alert with score and rewards

---

## 📊 Success Criteria

### Performance
- [X] Challenge creation <500ms (P95)
- [X] Quiz loading <1s
- [X] Answer submission <300ms

### Functionality
- [X] 48h cooldown enforced per subject
- [X] Referral attribution tracked
- [X] Both users receive rewards
- [X] Expired challenges rejected
- [X] Creator cannot join own challenge
- [X] Only one participant allowed

### UX
- [X] Beautiful gradient UI
- [X] Clear rewards preview
- [X] Smooth quiz navigation
- [X] Immediate feedback on submission
- [X] Graceful error handling

---

## 🐛 Bug Report Template

**If you encounter issues, report using this format:**

```
**Bug:** [Short description]
**Severity:** Critical | High | Medium | Low
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Logs:** [Console errors or Firebase logs]
**Screenshots:** [If applicable]
```

---

## ✅ Test Completion Checklist

- [ ] Test 1: Basic Challenge Flow (CRITICAL)
- [ ] Test 2: Cooldown Enforcement (CRITICAL)
- [ ] Test 3: Expired Challenge Handling
- [ ] Test 4: Creator Cannot Join Own Challenge
- [ ] Test 5: Only One Participant Allowed
- [ ] Test 6: Incomplete Answers Validation
- [ ] Test 7: Feature Flag Toggle
- [ ] Test 8: Difficulty Scaling
- [ ] Test 9: Analytics Events
- [ ] Test 10: UI/UX Validation

---

## 🚀 Post-Testing

**If all tests pass:**
1. Mark PR23 as "Ready for Production"
2. Deploy to production with 5% rollout
3. Monitor K-factor and completion rate for 24h
4. Ramp to 100% if metrics healthy

**If issues found:**
1. Document bugs using template above
2. Fix issues
3. Re-test failed scenarios
4. Repeat until all tests pass

---

**Tester:** [Name]  
**Date:** [Date]  
**Environment:** Staging | Production  
**Device:** iOS | Android  
**App Version:** [Version]

