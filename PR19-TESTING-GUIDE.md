# PR19: Progress Reels - Testing Guide

## Overview
Comprehensive testing guide for Privacy-Compliant Progress Reels with consent management, PII redaction, and image carousel.

**Prerequisites:**
- Firebase Functions deployed
- Firestore rules and indexes deployed
- App running on physical device (for push notifications)
- Test user account with PR20 session summaries

---

## Test 1: Consent Flow

### Objective
Verify that consent explainer works and updates Firestore correctly.

### Steps

1. **Navigate to Consent Screen**
   - TODO: Add consent prompt trigger (manual or automatic)
   - Currently: Need to manually navigate or trigger from settings

2. **Review Consent Explainer**
   - Verify sections: "What gets shared", "What stays private", "Your control"
   - Verify example highlight displays
   - Check UI is responsive and scrollable

3. **Grant Consent**
   - Tap "Allow Sharing" button
   - Expected: Success feedback, modal dismisses

4. **Verify Firestore Update**
   ```bash
   # Check user document
   firebase firestore:get users/{userId}
   ```
   Expected output:
   ```json
   {
     "consents": {
       "progressSharing": true,
       "grantedAt": "2025-11-04T...",
       "updatedAt": "2025-11-04T..."
     }
   }
   ```

5. **Verify Audit Log**
   ```bash
   # Check consent history
   firebase firestore:get consents/{userId}/history --limit 1
   ```
   Expected: Entry with action='granted', triggeredBy='user'

### Expected Results
- [  ] Consent explainer displays correctly
- [  ] "Allow Sharing" updates Firestore
- [  ] Audit log created
- [  ] No errors in console

---

## Test 2: PII Redaction (Unit Tests)

### Objective
Verify that school names and combined PII are correctly redacted.

### Steps

1. **Run Unit Tests**
   ```bash
   cd functions
   npm test -- piiRedaction.test.ts
   ```

2. **Review Test Results**
   Expected: All 15+ tests passing
   - School name redaction (high school, elementary, academy, etc.)
   - Combined PII (names + emails + schools)
   - Edge cases (apostrophes, multiple schools)

### Expected Results
- [  ] All PII redaction tests pass
- [  ] School names redacted correctly
- [  ] Educational content preserved

---

## Test 3: Progress Reel Generation (Backend)

### Objective
Verify that progress reels generate correctly after high-quality sessions.

### Prerequisites
- User has granted consent (Test 1)
- Session summary exists with qualityScore >= 80

### Steps

1. **Create Mock Session Summary**
   ```bash
   # Manually create a test summary
   firebase firestore:set sessions/{sessionId}/summaries/{summaryId} '{
     "sessionId": "test_session_1",
     "qualityScore": 85,
     "sentiment": "positive",
     "highlights": [
       "Student mastered solving quadratic equations using factoring.",
       "Demonstrated excellent understanding of the discriminant concept at Lincoln High School.",
       "Made significant progress in problem-solving speed. Contact john@example.com for details."
     ],
     "topics": ["Algebra", "Quadratic Equations"],
     "createdAt": "2025-11-04T12:00:00Z"
   }'
   ```

2. **Trigger Action Analyzer**
   - The `afterSummary` trigger should run automatically
   - Or manually call: `firebase functions:shell`
   ```javascript
   afterSummary({ params: { sessionId: 'test_session_1' } })
   ```

3. **Check Cloud Functions Logs**
   ```bash
   firebase functions:log --only afterSummary
   ```
   Expected logs:
   - "🔍 Analyzing action opportunities"
   - "💡 Opportunities identified" (should include progressReel)
   - "⚡ Starting action execution"
   - "🎬 Generating progress reel"
   - "🔒 PII redaction complete"
   - "✅ Progress reel generated successfully"

4. **Verify Reel Document**
   ```bash
   firebase firestore:get reels --where userId=={userId} --limit 1
   ```
   Expected fields:
   ```json
   {
     "reelId": "reel_test_session_1_...",
     "userId": "{userId}",
     "sessionId": "test_session_1",
     "highlights": [
       "Student mastered solving quadratic equations using factoring.",
       "Demonstrated excellent understanding of the discriminant concept at [SCHOOL].",
       "Made significant progress in problem-solving speed. Contact [EMAIL] for details."
     ],
     "qualityScore": 85,
     "sentiment": "positive",
     "referralLink": "https://messageai.app/r/...",
     "status": "ready",
     "expiresAt": "2025-12-04T..." // 30 days from now
   }
   ```

5. **Verify PII Redaction**
   - Check that "Lincoln High School" → "[SCHOOL]"
   - Check that "john@example.com" → "[EMAIL]"
   - Check that educational content is preserved

6. **Verify Notification Queued**
   ```bash
   firebase firestore:get notifications --where userId=={userId} --limit 1
   ```
   Expected:
   ```json
   {
     "userId": "{userId}",
     "title": "Your Progress Reel is Ready! 🎥",
     "body": "Share your student's achievements with friends",
     "data": {
       "type": "progress_reel",
       "reelId": "reel_...",
       "sessionId": "test_session_1"
     },
     "read": false
   }
   ```

### Expected Results
- [  ] Action analyzer identifies progressReel opportunity
- [  ] Reel generated with PII redacted
- [  ] Referral link created
- [  ] 30-day expiration set
- [  ] Notification queued
- [  ] No errors in logs

---

## Test 4: Progress Reel Viewer (Frontend)

### Objective
Verify that the carousel modal displays correctly and share works.

### Steps

1. **Open App and Navigate to Reel**
   - Tap notification: "Your Progress Reel is Ready!"
   - Or manually navigate: `/progressReel?reelId={reelId}`

2. **Verify Loading State**
   - Expected: Spinner while fetching reel

3. **Verify Intro Slide**
   - Expected: Emoji (🎉 for positive), "Session Highlights", quality score

4. **Swipe Through Highlights**
   - Swipe left to see each highlight
   - Expected: Numbered circles (1, 2, 3...), centered text

5. **Verify Pagination**
   - Expected: Dots at bottom show current slide
   - Active dot is green and wider

6. **Verify CTA Slide**
   - Swipe to last slide
   - Expected: Rocket emoji, "Want Results Like This?", "Join our tutoring community"

7. **Test Share Button (Header)**
   - Tap share icon in top-right
   - Expected: Native share sheet opens
   - Expected: Message includes referral link

8. **Test Share Button (Bottom)**
   - Tap "Share Progress Reel" button
   - Expected: Same as header share

9. **Close Modal**
   - Tap X button in top-left
   - Expected: Modal dismisses, returns to previous screen

### Expected Results
- [  ] All slides render correctly
- [  ] Carousel swipes smoothly (60fps)
- [  ] Pagination dots update
- [  ] Share functionality works
- [  ] Close button works
- [  ] No layout issues on different screen sizes

---

## Test 5: Consent Revocation

### Objective
Verify that revoking consent deletes all reels within reasonable time.

### Steps

1. **Verify Reels Exist**
   ```bash
   firebase firestore:get reels --where userId=={userId}
   ```
   Expected: At least 1 reel document

2. **Revoke Consent**
   - In app, navigate to settings (TODO: Add settings screen)
   - Or manually update Firestore:
   ```bash
   firebase firestore:update users/{userId} '{
     "consents.progressSharing": false,
     "consents.revokedAt": "2025-11-04T12:00:00Z"
   }'
   ```

3. **Wait for Trigger (< 5 seconds)**
   - The `onConsentRevoked` trigger should run automatically

4. **Check Logs**
   ```bash
   firebase functions:log --only onConsentRevoked
   ```
   Expected logs:
   - "🚨 Progress sharing consent revoked, deleting reels"
   - "✅ Reels deleted after consent revocation" with deletedCount

5. **Verify Reels Deleted**
   ```bash
   firebase firestore:get reels --where userId=={userId}
   ```
   Expected: No documents (empty result)

6. **Verify Audit Log**
   ```bash
   firebase firestore:get consents/{userId}/history --orderBy timestamp desc --limit 1
   ```
   Expected: Entry with action='revoked'

### Expected Results
- [  ] Consent revocation updates Firestore
- [  ] Trigger runs within 5 seconds
- [  ] All reels deleted
- [  ] Audit log created
- [  ] No errors in logs

---

## Test 6: No Consent Scenario

### Objective
Verify that reels are NOT generated if user hasn't granted consent.

### Steps

1. **Ensure No Consent**
   ```bash
   firebase firestore:update users/{userId} '{
     "consents.progressSharing": false
   }'
   ```

2. **Create High-Quality Session**
   - Same as Test 3, step 1

3. **Trigger Action Analyzer**
   - Same as Test 3, step 2

4. **Check Logs**
   ```bash
   firebase functions:log --only afterSummary
   ```
   Expected logs:
   - "⏭️ Skipped progressReel" with reason="User has not granted consent"

5. **Verify No Reel Created**
   ```bash
   firebase firestore:get reels --where sessionId==test_session_1
   ```
   Expected: No documents

6. **Verify No Notification**
   ```bash
   firebase firestore:get notifications --where userId=={userId} --where data.type==progress_reel
   ```
   Expected: No documents

### Expected Results
- [  ] Action skipped due to missing consent
- [  ] No reel created
- [  ] No notification sent
- [  ] Graceful skip (no errors)

---

## Test 7: Low Quality Session

### Objective
Verify that reels are NOT generated for low-quality sessions.

### Steps

1. **Ensure Consent Granted**
   - From Test 1

2. **Create Low-Quality Session**
   ```bash
   firebase firestore:set sessions/{sessionId}/summaries/{summaryId} '{
     "sessionId": "test_session_low",
     "qualityScore": 50,
     "sentiment": "neutral",
     "highlights": ["Basic review of concepts."],
     "topics": ["Math"],
     "createdAt": "2025-11-04T12:00:00Z"
   }'
   ```

3. **Trigger Action Analyzer**
   - Same as Test 3, step 2

4. **Check Logs**
   Expected: progressReel NOT in opportunities (qualityScore < 70)

5. **Verify No Reel Created**
   ```bash
   firebase firestore:get reels --where sessionId==test_session_low
   ```
   Expected: No documents

### Expected Results
- [  ] Low-quality session does NOT trigger reel
- [  ] No reel created
- [  ] No notification sent

---

## Test 8: Referral Attribution

### Objective
Verify that shared reel links track attribution correctly.

### Prerequisites
- Reel generated (Test 3)
- Referral link available

### Steps

1. **Get Referral Link**
   ```bash
   firebase firestore:get reels/{reelId} --fields referralLink
   ```

2. **Open Link in Browser or Second Device**
   - Copy referral link
   - Open in incognito/private browser
   - Or open on second physical device

3. **Verify Referral Click Tracked**
   ```bash
   firebase firestore:get referrals --where loopType==progress_reel --orderBy createdAt desc --limit 1
   ```
   Expected: Status updated to 'clicked'

4. **Sign Up New User (Optional)**
   - Complete sign-up flow via referral link
   - Expected: Referral status updates to 'signed_up'

### Expected Results
- [  ] Referral link opens correctly
- [  ] Click tracked in Firestore
- [  ] Attribution chain works (PR15 integration)

---

## Test 9: Stress Test

### Objective
Verify system handles multiple reels and edge cases.

### Steps

1. **Generate 10 Reels**
   - Create 10 high-quality sessions
   - Verify all reels generate

2. **Check Performance**
   - Verify carousel scrolls smoothly with many slides
   - Verify Firestore queries complete <1s

3. **Test Expiration**
   - Manually set `expiresAt` to past date
   - Verify reel still accessible (cleanup is separate job)

4. **Test Large Highlights**
   - Create session with 10+ highlights
   - Verify carousel handles many slides

### Expected Results
- [  ] Multiple reels generate successfully
- [  ] No performance degradation
- [  ] Large carousels work

---

## Test 10: Error Handling

### Objective
Verify graceful error handling.

### Scenarios

1. **Invalid Session ID**
   - Manually trigger with non-existent sessionId
   - Expected: Logged to `/failed_operations`, no crash

2. **Missing Referral Service**
   - Temporarily break `createReferralInternal` import
   - Expected: Reel generation fails gracefully, logged

3. **Network Failure**
   - Turn off network mid-generation
   - Expected: Retry or log failure

### Expected Results
- [  ] All errors logged
- [  ] No crashes
- [  ] Graceful degradation

---

## Acceptance Checklist

### Backend
- [  ] Consent granted/revoked correctly
- [  ] PII redaction works (all test cases pass)
- [  ] Reels generate for qualityScore >= 80
- [  ] Reels NOT generated without consent
- [  ] Consent revocation deletes reels (<1 hour)
- [  ] Referral links created correctly
- [  ] Notifications queued
- [  ] All Cloud Functions deploy successfully

### Frontend
- [  ] Consent explainer displays correctly
- [  ] Carousel slides smoothly (60fps)
- [  ] Share functionality works (native sheet)
- [  ] Notification tap navigates to reel
- [  ] Close button works
- [  ] Loading states display
- [  ] No layout issues (different screens)

### Data & Privacy
- [  ] School names redacted
- [  ] Emails redacted
- [  ] Phone numbers redacted
- [  ] Educational content preserved
- [  ] 30-day expiration set
- [  ] Consent audit trail complete
- [  ] Firestore rules protect data

### Integration
- [  ] PR20 integration (action analyzer)
- [  ] PR15 integration (referral attribution)
- [  ] PR16 integration (orchestrator - future)
- [  ] Push notifications work (expo-notifications)

---

## Known Issues / Limitations

1. **Manual Consent Trigger**
   - TODO: Add automatic consent prompt on first high-quality session
   - Workaround: Manual navigation or settings screen

2. **Analytics Stub**
   - `trackReelEvent()` is stub only
   - TODO: Integrate with PR17 experiments

3. **Cost Monitoring**
   - No budget tracking yet
   - TODO: Add cost alerts (PR20 task)

4. **Manual Testing Required**
   - No automated E2E tests yet
   - Requires physical device for push notifications

---

## Monitoring (Post-Deployment)

### Key Metrics
- Consent grant rate (target: >60%)
- Reel generation success rate (target: >95%)
- Share rate (target: >30% of generated reels)
- Click-through rate on shared links (target: >10%)
- PII redaction accuracy (target: 100%)

### Dashboards
- Cloud Functions logs: `firebase functions:log`
- Firestore console: Monitor `/reels`, `/consents`
- Analytics: Track `reel_*` events

### Alerts
- Reel generation failures > 5%
- Consent revocation spike (may indicate UX issue)
- PII leakage detected (emergency)

---

## Rollback Plan

If critical issues arise:

1. **Disable Feature Flag**
   ```typescript
   // app/src/config/featureFlags.ts
   loops: { progressReel: { enabled: false } }
   ```

2. **Disable Cloud Function**
   ```bash
   firebase functions:delete onConsentRevoked
   ```

3. **Emergency Reel Deletion**
   ```bash
   firebase firestore:delete --all-collections --recursive reels
   ```

---

**Testing Time Estimate:** 2-3 hours  
**Team:** 1 engineer + 1 QA

✅ Complete all tests before marking PR19 as production-ready!

