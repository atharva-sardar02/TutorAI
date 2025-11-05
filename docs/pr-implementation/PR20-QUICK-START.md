# PR20: Transcription & Agentic Actions - Quick Start

**Status:** ⏳ Ready for Implementation  
**Dependencies:** PR16 (Orchestrator), PR25 (Incentives)  
**Time:** 2 weeks

---

## 🎯 What We're Building

Transform tutoring session recordings into:
1. **Transcripts** (Whisper API) - 5-10 min
2. **AI Summaries** (GPT-4o-mini) - 20-30s
3. **Action Triggers** - 4+ viral opportunities per session
4. **Prep Packs** - Study materials for next session

---

## 📦 Key Components

### Backend (Functions)
```
functions/src/
├── transcription/
│   └── transcribeSession.ts      ✨ Whisper integration
├── ai/
│   └── sessionSummarizer.ts      ✨ GPT-4o-mini summary
├── growth/
│   ├── actionAnalyzer.ts         ✨ Identify viral ops
│   ├── actionExecutor.ts         ✨ Run approved actions
│   └── generatePrepPack.ts       ✨ Study materials
└── index.ts                      ✨ Orchestration
```

### Frontend (App)
```
app/src/
├── screens/
│   └── SessionDetailScreen.tsx   ✨ View summary + materials
└── services/notifications/
    └── pushHandler.ts            ✨ Navigate to session
```

---

## 🚀 Implementation Steps

### Week 1: Transcription + Summarization

**Day 1-2: Whisper Integration**
```bash
# 1. Add OpenAI config
firebase functions:config:set openai.api_key="sk-..."

# 2. Create transcription service
# See: functions/src/transcription/transcribeSession.ts

# 3. Deploy
firebase deploy --only functions:transcribeSession

# 4. Test
# Upload audio to /recordings/test_session_1/audio.m4a
firebase functions:log --only transcribeSession
```

**Day 3-4: Summarization**
```bash
# 1. Create summarizer
# See: functions/src/ai/sessionSummarizer.ts

# 2. Deploy trigger
firebase deploy --only functions:afterTranscript

# 3. Test end-to-end
# Should auto-trigger after transcription
```

**Day 5: Testing & Cost Verification**
- Run 10 test sessions
- Verify cost <$0.50/session
- Check OpenAI dashboard

---

### Week 2: Actions + Frontend

**Day 6-7: Action Analyzer**
```bash
# 1. Create analyzer
# See: functions/src/growth/actionAnalyzer.ts

# 2. Add feature flags
# See: functions/src/utils/featureFlags.ts

# 3. Test action identification
npm test -- actionAnalyzer.test.ts
```

**Day 8-9: Action Executor + PrepPack**
```bash
# 1. Create executor
# See: functions/src/growth/actionExecutor.ts

# 2. Create PrepPack generator
# See: functions/src/growth/generatePrepPack.ts

# 3. Deploy all
firebase deploy --only functions:afterSummary
```

**Day 10: Frontend**
```bash
# 1. Create session detail screen
# See: app/src/screens/SessionDetailScreen.tsx

# 2. Update notification handler
# See: app/src/services/notifications/pushHandler.ts

# 3. Deploy
cd app && npx expo publish
```

---

## 🧪 Quick Test (30 min)

### Test 1: Upload Recording
```bash
# In Firebase Console Storage:
# Upload test audio to: /recordings/test_session_1/audio.m4a

# Monitor logs
firebase functions:log --only transcribeSession
```

**Expected:**
```
🎙️ Starting transcription { sessionId: 'test_session_1' }
📥 Downloaded audio { sizeKB: '5432' }
✅ Transcription complete { wordCount: 1234 }
```

---

### Test 2: Check Summary
```bash
# Wait ~30s, then:
firebase functions:log --only afterTranscript
```

**Expected:**
```
📝 Transcript created, starting summarization
🤖 Starting session summarization
✅ Summary generated { durationMs: 2500 }
```

**Verify in Firestore:**
- `/transcripts/test_session_1` → `{ text, wordCount, status: 'complete' }`
- `/sessions/test_session_1/summary/latest` → `{ highlights, topics, viralSignals }`

---

### Test 3: Check Actions
```bash
# Wait ~1 min, then:
firebase functions:log --only afterSummary
```

**Expected:**
```
🤖 Summary created, analyzing actions
🔍 Analyzing action opportunities { opportunityCount: 4 }
⚡ Starting action execution
✅ Executed prepPack
✅ Action execution complete
```

**Verify in Firestore:**
- `/sessions/test_session_1/prepPacks/{id}` → `{ title, materials, estimatedTime }`
- `/loop_exposures/` → new entries for each action

---

### Test 4: Frontend
```bash
# 1. Open app
# 2. Tap push notification: "Session Highlights Ready!"
# 3. Should navigate to Session Detail screen
# 4. Verify displays:
#    - Highlights
#    - Topics
#    - Student progress
#    - Prep pack materials
```

---

## 💰 Cost Monitoring

### Per Session (60 min)
- **Whisper:** 60 min × $0.006/min = **$0.36**
- **GPT-4o-mini:** ~3K tokens × $0.15/1M = **$0.0005**
- **Total:** **~$0.36** ✅ (under $0.50 target)

### At Scale (1000 sessions/month)
- **Monthly cost:** $360
- **Per user:** ~$0.36/session (assuming 1 session/week)

**Optimization tips:**
- Limit transcript length to 8K tokens
- Batch summaries if possible
- Use prompt caching (GPT-4o supports this)

---

## 🚨 Troubleshooting

### Issue: Transcription Times Out
**Symptoms:** Function exceeds 9-min timeout

**Fix:**
1. Increase timeout: `timeoutSeconds: 540` → `900`
2. Check audio file size (max 100MB)
3. Verify OpenAI API status

---

### Issue: Summary Generation Fails
**Symptoms:** `Error: Invalid JSON response`

**Fix:**
1. Check prompt in `sessionSummarizer.ts`
2. Verify `response_format: { type: 'json_object' }`
3. Add error handling for malformed JSON

---

### Issue: Actions Not Triggering
**Symptoms:** Summary created but no actions

**Fix:**
1. Check feature flags: `growth.agenticActions.enabled`
2. Verify orchestrator eligibility (cooldowns, etc.)
3. Check logs: `firebase functions:log --only afterSummary`

---

### Issue: High Costs
**Symptoms:** Cost exceeds $0.50/session

**Fix:**
1. Reduce transcript length: `transcript.text.slice(0, 8000)`
2. Lower `max_tokens` in summarizer: `1000` → `500`
3. Consider batching multiple sessions

---

## 📊 Key Metrics Dashboard

Monitor these in Firebase Console or PR29 Ops Dashboard:

| Metric | Target | Alert If |
|--------|--------|----------|
| Transcription time (P95) | <10 min | >12 min |
| Summary time (P95) | <30s | >60s |
| Actions per session | ≥4 | <2 |
| Cost per session | <$0.50 | >$0.70 |
| Error rate | <1% | >5% |
| PrepPack open rate | >60% | <40% |

---

## 🔗 Related PRs

- **PR16** (Orchestrator) - Required for action eligibility checks
- **PR25** (Incentives) - Required for reward issuance
- **PR18** (Tutor Cards) - Can trigger from high-quality sessions
- **PR19** (Progress Reels) - Depends on PR20 transcripts
- **PR23** (Study Buddy) - Can trigger from challenging topics

---

## 📚 Documentation

- **Full Plan:** `PR20-IMPLEMENTATION-PLAN.md`
- **Testing Guide:** Create `PR20-TESTING-GUIDE.md` after implementation
- **Architecture:** `docs/ARCHITECTURE_OVERVIEW.md` (update after complete)

---

**Ready to start?** Follow Week 1 steps above! 🚀

