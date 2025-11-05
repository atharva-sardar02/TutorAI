# Firestore Feature Flags Setup Guide

**Quick Reference for Setting Up Growth Feature Flags**

---

## 🚀 Quick Steps

### 1. Open Firebase Console
👉 **Direct Link:** https://console.firebase.google.com/project/messageai-88921/firestore

### 2. Create Collection
- Click **"Start collection"** (or **"+"** if Firestore already has data)
- Collection ID: `feature_flags`
- Click **"Next"**

### 3. Add 11 Documents

For each document below, click **"Add document"** and enter the fields:

---

## 📋 Required Documents

### 🔑 **Document 1: growth_master** (Master Kill-Switch)
```
Document ID: growth_master

Fields:
  enabled: true (boolean)
  description: "Master kill-switch for all growth features" (string)
```

---

### 🎨 **Document 2: loop_tutorCard** (PR18)
```
Document ID: loop_tutorCard

Fields:
  enabled: true (boolean)
  description: "PR18 - Tutor Card viral loop" (string)
  rolloutPercent: 100 (number)
```

---

### 🎥 **Document 3: loop_progressReel** (PR19)
```
Document ID: loop_progressReel

Fields:
  enabled: true (boolean)
  description: "PR19 - Progress Reel viral loop" (string)
  rolloutPercent: 100 (number)
```

---

### 🎯 **Document 4: loop_studyBuddy** (PR23 - CRITICAL!)
```
Document ID: loop_studyBuddy

Fields:
  enabled: true (boolean)
  description: "PR23 - Study Buddy Challenge viral loop" (string)
  rolloutPercent: 100 (number)
```

---

### 👥 **Document 5: loop_parentPod** (PR24 - Not Implemented)
```
Document ID: loop_parentPod

Fields:
  enabled: false (boolean)
  description: "PR24 - Parent Pod viral loop (not yet implemented)" (string)
  rolloutPercent: 0 (number)
```

---

### 🤝 **Document 6: loop_tutorPeer** (PR24 - Not Implemented)
```
Document ID: loop_tutorPeer

Fields:
  enabled: false (boolean)
  description: "PR24 - Tutor Peer referral loop (not yet implemented)" (string)
  rolloutPercent: 0 (number)
```

---

### 🎤 **Document 7: transcription_enabled** (PR20)
```
Document ID: transcription_enabled

Fields:
  enabled: true (boolean)
  description: "PR20 - Session transcription via Whisper" (string)
  rolloutPercent: 100 (number)
```

---

### 🤖 **Document 8: agentic_actions_enabled** (PR20)
```
Document ID: agentic_actions_enabled

Fields:
  enabled: true (boolean)
  description: "PR20 - AI-driven action recommendations" (string)
  rolloutPercent: 100 (number)
```

---

### 📊 **Document 9: activity_feed_enabled** (PR21)
```
Document ID: activity_feed_enabled

Fields:
  enabled: true (boolean)
  description: "PR21 - Real-time activity feed by subject" (string)
  rolloutPercent: 100 (number)
```

---

### 🏠 **Document 10: cohort_rooms_enabled** (PR27)
```
Document ID: cohort_rooms_enabled

Fields:
  enabled: true (boolean)
  description: "PR27 - Real-time cohort rooms" (string)
  rolloutPercent: 100 (number)
```

---

### 🏆 **Document 11: leaderboards_enabled** (PR27)
```
Document ID: leaderboards_enabled

Fields:
  enabled: true (boolean)
  description: "PR27 - Mini-leaderboards by subject" (string)
  rolloutPercent: 100 (number)
```

---

## ✅ Verification

After creating all 11 documents, you should see:
- **8 flags ENABLED** (with `enabled: true`)
- **2 flags DISABLED** (with `enabled: false` - for unimplemented PR24)
- **1 master switch ENABLED** (`growth_master`)

### Quick Check
```bash
# In Firestore Console, verify:
/feature_flags
  ├── growth_master (enabled: true)
  ├── loop_tutorCard (enabled: true, rolloutPercent: 100)
  ├── loop_progressReel (enabled: true, rolloutPercent: 100)
  ├── loop_studyBuddy (enabled: true, rolloutPercent: 100) ← PR23
  ├── loop_parentPod (enabled: false, rolloutPercent: 0)
  ├── loop_tutorPeer (enabled: false, rolloutPercent: 0)
  ├── transcription_enabled (enabled: true, rolloutPercent: 100)
  ├── agentic_actions_enabled (enabled: true, rolloutPercent: 100)
  ├── activity_feed_enabled (enabled: true, rolloutPercent: 100)
  ├── cohort_rooms_enabled (enabled: true, rolloutPercent: 100)
  └── leaderboards_enabled (enabled: true, rolloutPercent: 100)
```

---

## 🔄 How to Toggle Flags Later

### Enable a Feature
1. Navigate to document (e.g., `loop_studyBuddy`)
2. Change `enabled` field from `false` to `true`
3. Save

### Disable a Feature
1. Navigate to document
2. Change `enabled` field from `true` to `false`
3. Save
4. **Effect:** Feature disables within 60 seconds (cache TTL)

### Gradual Rollout
1. Navigate to document
2. Change `rolloutPercent` (0-100)
3. Example: `rolloutPercent: 50` = 50% of users see the feature
4. Save

---

## 🎯 What Happens After Setup?

### Backend (Cloud Functions)
- ✅ Functions check these flags before executing
- ✅ `isLoopEnabled('studyBuddy')` returns `true`
- ✅ Challenges can be created

### Frontend (App)
- ✅ App checks local flags (`featureFlags.ts`)
- ✅ UI components render based on flags
- ✅ Study Buddy Challenge fully functional

### Cache Behavior
- **TTL:** 60 seconds
- **Fail-Open:** If Firestore read fails, defaults to `enabled: true`
- **Update Propagation:** ~60s after flag change

---

## ⚠️ Critical Flags for PR23

**These flags MUST be enabled for PR23 to work:**

1. ✅ `growth_master` → `enabled: true`
2. ✅ `loop_studyBuddy` → `enabled: true`, `rolloutPercent: 100`

**Optional but recommended:**

3. ✅ `agentic_actions_enabled` → `enabled: true` (for auto-triggering challenges)
4. ✅ `transcription_enabled` → `enabled: true` (for session analysis)

---

## 🐛 Troubleshooting

### "Challenge not being created"
**Check:**
1. Firestore Console → `/feature_flags/growth_master` → `enabled: true`
2. Firestore Console → `/feature_flags/loop_studyBuddy` → `enabled: true`
3. Wait 60 seconds (cache refresh)
4. Check Cloud Functions logs: `firebase functions:log --only createStudyBuddyChallenge`

### "Functions return 'skipped'"
**Likely Cause:** `growth_master` or `loop_studyBuddy` is `false`

**Fix:** Enable both flags in Firestore

### "Still not working after enabling"
**Solution:** Clear cache manually (optional, usually not needed)
```bash
# Restart Cloud Functions (forces cache clear)
firebase functions:delete loop_studyBuddy
firebase deploy --only functions:createStudyBuddyChallenge
```

---

## 📚 Related Docs

- `PR23-DEPLOYMENT-SUMMARY.md` - Full deployment details
- `PR23-TESTING-GUIDE.md` - How to test PR23
- `PR23-QUICK-START.md` - Quick start guide

---

## ✨ After Setup

Once all flags are created:
1. ✅ Backend is fully operational
2. ✅ PR23 features are live
3. ✅ Ready for end-to-end testing
4. ✅ Can proceed to app deployment

**Next Step:** Deploy app to device and test!

---

**Created:** November 4, 2025  
**Project:** messageai-88921  
**Console:** https://console.firebase.google.com/project/messageai-88921/firestore

