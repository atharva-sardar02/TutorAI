# PR20: Quick Test Guide (5 Minutes)

**Status:** ✅ Implementation Complete  
**Time:** 5 minutes to verify basic functionality

---

## 🚀 Quick Deploy & Test

### Step 1: Build & Deploy (2 min)

```bash
# Build functions
cd /Users/tahmeedrahim/Projects/MessageAI/functions
npm run build

# Deploy PR20 functions
cd ..
firebase deploy --only functions:transcribeSession,functions:afterTranscript,functions:afterSummary
```

**Expected Output:**
```
✔ Deploy complete!
Functions:
  ✔ transcribeSession (Storage trigger)
  ✔ afterTranscript (Firestore trigger)
  ✔ afterSummary (Firestore trigger)
```

---

### Step 2: Setup Feature Flags (1 min)

In **Firebase Console → Firestore**, create these documents:

```javascript
// /feature_flags/prepPack
{
  enabled: true,
  description: "PR20: Prep pack generation"
}

// /feature_flags/agenticActions
{
  enabled: true,
  description: "PR20: Action analyzer"
}

// /feature_flags/transcription
{
  enabled: true,
  description: "PR20: Whisper transcription"
}
```

---

### Step 3: Test Without Audio (30 sec)

Create a mock session summary to test the frontend:

**Firebase Console → Firestore:**

```javascript
// Create: /sessions/test_session_1/summary/latest

{
  sessionId: "test_session_1",
  highlights: [
    "Student solved quadratic equations independently",
    "Demonstrated understanding of factoring techniques",
    "Asked insightful questions about real-world applications"
  ],
  topics: ["Algebra", "Quadratic Equations", "Factoring"],
  studentProgress: {
    strengths: ["Problem-solving skills", "Quick learner"],
    improvements: ["More practice with word problems"],
    nextSteps: ["Complete practice worksheet", "Review factoring rules"]
  },
  sentiment: "positive",
  qualityScore: 85,
  viralSignals: {
    hasBigWin: true,
    hasProgress: true,
    hasTestTopic: false,
    hasPositiveFeedback: true
  },
  model: "gpt-4o-mini",
  tokenCount: 500,
  createdAt: [Timestamp: now]
}
```

---

### Step 4: Test Frontend (1 min)

```bash
# In your app (if already running, just navigate)
# Go to: /sessionDetail?sessionId=test_session_1
```

**Or manually navigate in app:**
- Open any screen
- In browser/dev tools, run:
  ```javascript
  router.push('/sessionDetail?sessionId=test_session_1')
  ```

**Expected Result:**
- ✅ Quality score badge shows "85"
- ✅ 3 highlight cards appear
- ✅ Topics show as chips
- ✅ Progress sections populate
- ✅ Share button works

---

### Step 5: Test Full Pipeline (Optional, 10+ min)

If you want to test the complete transcription → summary → actions flow:

1. **Get Test Audio File:**
   ```bash
   # Download a sample audio file or use:
   # https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav
   ```

2. **Upload to Storage:**
   - Firebase Console → Storage
   - Create path: `/recordings/test_session_2/`
   - Upload audio file as `audio.m4a` (or rename .wav to .m4a)

3. **Monitor Logs:**
   ```bash
   # Watch transcription (5-10 min)
   firebase functions:log --only transcribeSession
   
   # Watch summarization (~30s after transcript)
   firebase functions:log --only afterTranscript
   
   # Watch actions (~1 min after summary)
   firebase functions:log --only afterSummary
   ```

4. **Check Results:**
   - Firestore → `/transcripts/test_session_2` → transcript text
   - Firestore → `/sessions/test_session_2/summary/latest` → AI summary
   - Firestore → `/sessions/test_session_2/prepPacks/latest` → prep pack
   - Firestore → `/notifications/` → notification queued

5. **View in App:**
   ```bash
   # Navigate to session detail
   # URL: /sessionDetail?sessionId=test_session_2
   ```

---

## 🐛 Quick Troubleshooting

### Issue: "No summary available"
**Fix:** Create mock summary manually (see Step 3)

### Issue: "Function not deployed"
```bash
firebase functions:list | grep -E "(transcribe|afterTranscript|afterSummary)"
```
**Expected:** 3 functions listed

### Issue: "OPENAI_API_KEY not set"
```bash
cd functions
firebase functions:config:set openai.api_key="sk-..."
firebase deploy --only functions
```

### Issue: "Permission denied on Storage"
```bash
# Update storage.rules to allow uploads to /recordings/
# Then: firebase deploy --only storage
```

---

## ✅ Success Checklist

- [ ] Functions deployed successfully
- [ ] Feature flags created in Firestore
- [ ] Mock summary renders in frontend
- [ ] All UI sections display correctly
- [ ] Share button works
- [ ] (Optional) Full pipeline tested with real audio

---

## 📊 What to Monitor

After deployment, watch these metrics:

```bash
# Function invocations
firebase functions:log --only transcribeSession --limit 10

# Errors
firebase functions:log --only afterSummary | grep ERROR

# Costs (in OpenAI dashboard)
# Expected: ~$0.36 per 60-min session
```

---

## 🎉 Next Steps

1. **Test with real tutoring session recording**
2. **Monitor costs in OpenAI dashboard**
3. **Gather user feedback on summary quality**
4. **Create PR19 (Progress Reels) - depends on PR20 transcripts**

---

**Questions?** Check `PR20-SUMMARY.md` for full documentation.

