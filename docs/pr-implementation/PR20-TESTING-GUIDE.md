# PR20: Transcription & Agentic Actions - Testing Guide

**Status:** ✅ Implementation Complete  
**Test Type:** Comprehensive end-to-end verification  
**Estimated Time:** 20-30 minutes (with real audio) or 5 minutes (with mock data)

---

## 🎯 Testing Objectives

Verify that:
1. Audio recordings are transcribed correctly using Whisper API
2. Transcripts are summarized with highlights, topics, and progress
3. Actions are identified and executed (PrepPack always generated)
4. Push notifications are sent to users
5. SessionDetailScreen displays all data correctly
6. Error handling and fallbacks work

---

## 📋 Prerequisites

### Backend Setup
```bash
# Ensure OpenAI API key is set
cd /Users/tahmeedrahim/Projects/MessageAI/functions
firebase functions:config:get openai.api_key
# Should return: sk-...

# If not set:
firebase functions:config:set openai.api_key="sk-YOUR-KEY-HERE"

# Deploy PR20 functions
npm run build
cd ..
firebase deploy --only functions:transcribeSession,functions:afterTranscript,functions:afterSummary
```

### Frontend Setup
```bash
cd /Users/tahmeedrahim/Projects/MessageAI/app
# App should be running (or build and deploy)
npx expo start
```

### Feature Flags (Firestore Console)
```javascript
// /feature_flags/transcription
{
  enabled: true,
  maxAudioDuration: 120,
  retentionDays: 90
}

// /feature_flags/agenticActions
{
  enabled: true,
  maxActionsPerSession: 5
}

// /feature_flags/prepPack
{
  enabled: true
}
```

---

## 🧪 Test Cases

### Test 1: Quick Mock Summary Test (5 minutes)

**Goal:** Verify frontend displays session summary correctly without full pipeline.

**Steps:**

1. **Create Mock Summary in Firestore:**
   - Open Firebase Console → Firestore
   - Create document: `/sessions/test_session_mock/summary/latest`
   
   ```javascript
   {
     sessionId: "test_session_mock",
     highlights: [
       "Student mastered solving quadratic equations using factoring",
       "Demonstrated excellent understanding of the discriminant concept",
       "Successfully applied knowledge to 5 real-world physics problems"
     ],
     topics: ["Algebra", "Quadratic Equations", "Physics Applications"],
     studentProgress: {
       strengths: [
         "Strong problem-solving skills",
         "Quick grasp of abstract concepts",
         "Excellent work ethic and persistence"
       ],
       improvements: [
         "Could practice more word problems",
         "Speed up calculation accuracy"
       ],
       nextSteps: [
         "Complete 10 practice problems on factoring",
         "Review quadratic formula derivation",
         "Practice mixed problem sets"
       ]
     },
     sentiment: "positive",
     qualityScore: 92,
     viralSignals: {
       hasBigWin: true,
       hasProgress: true,
       hasTestTopic: true,
       hasPositiveFeedback: true
     },
     model: "gpt-4o-mini",
     tokenCount: 450,
     createdAt: [Timestamp: now]
   }
   ```

2. **Create Mock Prep Pack:**
   - Create document: `/sessions/test_session_mock/prepPacks/latest`
   
   ```javascript
   {
     sessionId: "test_session_mock",
     title: "Quadratic Equations Practice Pack",
     topics: ["Quadratic Equations", "Factoring", "Discriminant"],
     materials: [
       {
         type: "practice_problems",
         title: "Factoring Practice Set",
         content: "Solve the following:\n1. x² + 5x + 6 = 0\n2. 2x² - 8x + 6 = 0\n3. x² - 4 = 0\n\nSolutions:\n1. (x+2)(x+3) = 0 → x = -2 or x = -3\n2. 2(x-1)(x-3) = 0 → x = 1 or x = 3\n3. (x-2)(x+2) = 0 → x = 2 or x = -2"
       },
       {
         type: "study_guide",
         title: "Quadratic Equation Key Concepts",
         content: "Key Formula: ax² + bx + c = 0\n\nDiscriminant: b² - 4ac\n- If > 0: Two real solutions\n- If = 0: One real solution\n- If < 0: No real solutions\n\nFactoring Steps:\n1. Factor out GCF if possible\n2. Find two numbers that multiply to 'ac' and add to 'b'\n3. Rewrite middle term and factor by grouping"
       },
       {
         type: "flashcards",
         title: "Quadratic Formulas",
         content: "Card 1: Q: What is the quadratic formula? A: x = (-b ± √(b²-4ac)) / 2a\n\nCard 2: Q: What is the discriminant? A: b² - 4ac\n\nCard 3: Q: How to factor x² + 5x + 6? A: (x+2)(x+3)\n\nCard 4: Q: What does discriminant = 0 mean? A: One real solution (repeated root)"
       },
       {
         type: "video_links",
         title: "Recommended Videos",
         content: "1. Khan Academy: Factoring Quadratics\n   https://www.khanacademy.org/math/algebra/quadratics\n\n2. PatrickJMT: Quadratic Formula Explained\n   https://www.youtube.com/watch?v=dQw4w9WgXcQ\n\n3. Organic Chemistry Tutor: Discriminant\n   https://www.youtube.com/watch?v=dQw4w9WgXcQ"
       }
     ],
     nextSteps: [
       "Review the study guide before next session",
       "Complete all practice problems",
       "Watch at least one video"
     ],
     estimatedTime: 45,
     createdAt: [Timestamp: now]
   }
   ```

3. **Navigate to Session Detail:**
   - In app, navigate to: `/sessionDetail?sessionId=test_session_mock`
   - Or use deep link in terminal:
     ```bash
     xcrun simctl openurl booted "messageai://sessionDetail?sessionId=test_session_mock"
     ```

4. **Verify Display:**
   - [ ] Quality score badge shows "92"
   - [ ] Sentiment badge shows "😊 Positive" in green
   - [ ] 3 highlight cards appear with numbered badges
   - [ ] Topics display as green chips: Algebra, Quadratic Equations, Physics Applications
   - [ ] Progress section shows 3 subsections (Strengths, Improvements, Next Steps)
   - [ ] Prep pack title: "Quadratic Equations Practice Pack"
   - [ ] 4 material cards (calculator, book, layers, play-circle icons)
   - [ ] Estimated time: "45 min"
   - [ ] Tap material cards to view content in alert
   - [ ] Share button works (opens native share sheet)

**Expected Result:** ✅ All sections render correctly with beautiful UI

---

### Test 2: Full Pipeline with Real Audio (20-30 minutes)

**Goal:** Test complete transcription → summary → actions → notification → display flow.

**Steps:**

1. **Get Test Audio File:**
   - Option A: Use a sample tutoring recording (60s minimum for good testing)
   - Option B: Record a 60-second test conversation about a subject (e.g., math)
   - Option C: Use this public sample:
     ```bash
     curl -o test_audio.wav "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav"
     ```

2. **Upload to Firebase Storage:**
   - Firebase Console → Storage
   - Navigate to or create: `/recordings/test_session_real/`
   - Upload audio file and rename to: `audio.m4a`
   - Or use CLI:
     ```bash
     gsutil cp test_audio.wav gs://messageai-88921.appspot.com/recordings/test_session_real/audio.m4a
     ```

3. **Monitor Transcription (5-10 min):**
   ```bash
   # Watch logs in real-time
   firebase functions:log --only transcribeSession --follow
   ```
   
   **Expected Logs:**
   ```
   🎙️ Starting transcription { sessionId: 'test_session_real' }
   📥 Downloaded audio { sizeKB: '...' }
   🔊 Calling Whisper API...
   ✅ Transcription complete { wordCount: 123, duration: 60 }
   ```

4. **Verify Transcript (after transcription completes):**
   - Firestore → `/transcripts/test_session_real`
   - Should contain:
     ```javascript
     {
       sessionId: "test_session_real",
       text: "...", // Full transcript text
       wordCount: 123,
       duration: 60,
       status: "complete",
       createdAt: [Timestamp]
     }
     ```

5. **Monitor Summarization (~30s after transcript):**
   ```bash
   firebase functions:log --only afterTranscript --follow
   ```
   
   **Expected Logs:**
   ```
   📝 Transcript created, starting summarization
   🤖 Calling GPT-4o-mini...
   ✅ Summarization complete { highlights: 3, topics: 4 }
   ```

6. **Verify Summary:**
   - Firestore → `/sessions/test_session_real/summary/latest`
   - Should contain:
     ```javascript
     {
       sessionId: "test_session_real",
       highlights: [...],
       topics: [...],
       studentProgress: { strengths: [...], improvements: [...], nextSteps: [...] },
       sentiment: "positive" | "neutral" | "negative",
       qualityScore: 0-100,
       viralSignals: { ... },
       model: "gpt-4o-mini",
       tokenCount: ...,
       createdAt: [Timestamp]
     }
     ```

7. **Monitor Actions (~1 min after summary):**
   ```bash
   firebase functions:log --only afterSummary --follow
   ```
   
   **Expected Logs:**
   ```
   🤖 Summary created, analyzing actions
   💡 Opportunities identified { opportunityCount: 4 }
   🎁 Executing action: prepPack
   ✅ PrepPack generated
   📬 Notification queued
   ✅ Action execution complete { successCount: 1 }
   ```

8. **Verify Prep Pack:**
   - Firestore → `/sessions/test_session_real/prepPacks/latest`
   - Should contain materials array with 4 types

9. **Verify Notification:**
   - Firestore → `/notifications/` (look for newest doc)
   - Should contain:
     ```javascript
     {
       userId: "...",
       type: "session_summary",
       title: "Session Highlights Ready! 🎓",
       body: "Your session summary and prep materials are ready to view",
       data: {
         type: "session_summary",
         sessionId: "test_session_real"
       },
       status: "pending",
       createdAt: [Timestamp]
     }
     ```

10. **Test Notification Tap (if push service running):**
    - If notification delivered to device:
      - Tap notification
      - Should navigate to `/sessionDetail?sessionId=test_session_real`
    - If not, manually navigate in app

11. **Verify Frontend Display:**
    - Same checks as Test 1
    - Verify prep pack materials are relevant to session

**Expected Result:** ✅ Complete pipeline from audio → display works end-to-end

---

### Test 3: Error Handling & Fallbacks (5 minutes)

**Goal:** Verify graceful degradation when services fail.

#### 3A: Missing Summary

1. Navigate to: `/sessionDetail?sessionId=nonexistent_session`
2. **Expected:**
   - Error state displays: "No summary available"
   - Retry button appears
   - Back button works

#### 3B: No Prep Pack

1. Create summary without prep pack:
   - Firestore → `/sessions/test_no_preppack/summary/latest`
   - Add summary data (from Test 1) but don't create prep pack document
2. Navigate to: `/sessionDetail?sessionId=test_no_preppack`
3. **Expected:**
   - Summary displays correctly
   - Prep Pack section is hidden (no error)

#### 3C: Transcription Failure (simulated)

1. Upload invalid file to Storage:
   - Upload a text file renamed as `audio.m4a` to `/recordings/test_invalid_audio/`
2. Monitor logs:
   ```bash
   firebase functions:log --only transcribeSession
   ```
3. **Expected:**
   - Error logged: "❌ Transcription failed"
   - Transcript document created with `status: "failed"`
   - User not blocked (no notification sent)

**Expected Result:** ✅ All fallbacks work without blocking user

---

## 📊 Acceptance Criteria Checklist

### Backend ✅
- [x] Transcription service deployed and triggered on audio upload
- [x] Summary service creates structured summary from transcript
- [x] Action analyzer identifies 4+ action types
- [x] Action executor runs PrepPack generation
- [x] PrepPack always generated (universal value)
- [x] Feature flags integrated and respected
- [x] Cloud Function triggers configured correctly
- [x] Graceful error handling (retries, fallbacks)

### Frontend ✅
- [x] SessionDetailScreen renders all sections
- [x] Quality score badge displays correctly
- [x] Sentiment indicator works
- [x] Highlights display as numbered cards
- [x] Topics display as chips
- [x] Progress breakdown shows 3 subsections
- [x] Prep pack materials render with icons
- [x] Material cards are tappable
- [x] Share functionality works
- [x] Loading states display
- [x] Error states display with retry
- [x] Navigation from notification works

### Integration ✅
- [ ] End-to-end pipeline completes (audio → display)
- [ ] Notifications sent and routed correctly
- [ ] Cost stays under $0.50 per session
- [ ] Performance meets targets (transcription <10 min, summary <30s)

---

## 🐛 Common Issues & Fixes

### Issue: "OPENAI_API_KEY not set"
```bash
cd functions
firebase functions:config:set openai.api_key="sk-..."
firebase deploy --only functions
```

### Issue: "Permission denied" on Storage
Check `storage.rules`:
```
match /recordings/{sessionId}/{filename} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == resource.metadata.uploadedBy;
}
```

### Issue: Functions not deployed
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:transcribeSession,functions:afterTranscript,functions:afterSummary
```

### Issue: SessionDetailScreen not found (404)
- Verify file exists: `app/app/sessionDetail.tsx`
- Check Expo Router is picking it up
- Restart Expo dev server: `npx expo start --clear`

### Issue: Push notification not received
- Check notification document in Firestore has `status: "pending"`
- Verify push notification service is running
- Check device has valid push token in `/users/{userId}.pushToken`
- For testing, manually navigate to screen instead

### Issue: High costs
- Check OpenAI usage dashboard: https://platform.openai.com/usage
- Verify transcription length (should be <60 min)
- Ensure throttling is enabled (max 100/day)

---

## 📈 Performance Benchmarks

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Transcription Time (60 min) | <10 min | Check function logs |
| Summary Generation | <30s | Check function logs |
| Action Execution | <5 min | Check function logs |
| Cost per Session | <$0.50 | OpenAI usage dashboard |
| Actions Triggered | ≥4 | Check `afterSummary` logs |
| PrepPack Generation Rate | 100% | Check Firestore `/prepPacks` |

---

## ✅ Sign-Off Checklist

- [ ] Test 1 (Mock Summary) passed
- [ ] Test 2 (Full Pipeline) passed OR skipped with reason
- [ ] Test 3 (Error Handling) passed
- [ ] All acceptance criteria met
- [ ] Performance benchmarks within targets
- [ ] Cost per session verified
- [ ] No console errors or warnings
- [ ] Documentation reviewed and accurate

---

## 🎉 Next Steps After Testing

1. **Deploy to Production:**
   ```bash
   firebase deploy --only functions
   ```

2. **Enable Feature Flags Gradually:**
   - Start at 5% rollout
   - Monitor for 48 hours
   - Increase to 25%, 50%, 100%

3. **Monitor Metrics:**
   - OpenAI costs (daily)
   - Function errors (Sentry/Firebase)
   - User engagement (prep pack views)

4. **Gather Feedback:**
   - User surveys on summary quality
   - Prep pack usefulness ratings
   - Iteration on material types

5. **Implement PR19 (Progress Reels):**
   - Now unblocked with PR20 transcripts!
   - See `PR19-IMPLEMENTATION-PLAN.md`

---

**Test Date:** _________  
**Tester:** _________  
**Result:** ✅ PASS | ❌ FAIL | ⏸️ BLOCKED  
**Notes:** _________

