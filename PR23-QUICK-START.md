# PR23: Study Buddy Challenge - Quick Start

**Status:** ✅ Ready to Deploy  
**Time:** 5 minutes setup

---

## 🚀 Quick Deploy

### 1. Deploy Firestore Configuration (2 min)

```bash
# Deploy rules and indexes
firebase deploy --only firestore:rules,firestore:indexes

# Expected output:
# ✔ firestore:rules updated
# ✔ firestore:indexes updated
```

### 2. Deploy Cloud Functions (3 min)

```bash
cd functions
pnpm install  # If needed
firebase deploy --only functions:createStudyBuddyChallenge,functions:joinStudyBuddyChallenge,functions:submitStudyBuddyChallenge,functions:getStudyBuddyChallenge

# Expected output:
# ✔ functions[createStudyBuddyChallenge(us-central1)] deployed
# ✔ functions[joinStudyBuddyChallenge(us-central1)] deployed
# ✔ functions[submitStudyBuddyChallenge(us-central1)] deployed
# ✔ functions[getStudyBuddyChallenge(us-central1)] deployed
```

### 3. Build & Run App

```bash
cd app
pnpm install  # If needed
npx expo start

# For iOS: Press 'i'
# For Android: Press 'a'
```

---

## ✅ Verify Deployment

### Check Functions
```bash
firebase functions:list | grep studyBuddy

# Should show:
# createStudyBuddyChallenge(us-central1)
# joinStudyBuddyChallenge(us-central1)
# submitStudyBuddyChallenge(us-central1)
# getStudyBuddyChallenge(us-central1)
```

### Check Feature Flag
Open `app/src/config/featureFlags.ts`:
```typescript
loops: {
  studyBuddy: { enabled: true },  // ✅ Should be true
}
```

---

## 🧪 Quick Test (5 min)

### Option A: Manual Test
1. Open app as Student A
2. Complete practice session (score ≥70%)
3. Wait for notification: "Challenge Your Friends! 🎯"
4. Create challenge → Share link
5. Open link as Student B → Complete quiz
6. Verify both users earn +50 XP

### Option B: API Test (Postman/curl)
```bash
# 1. Create challenge
curl -X POST https://us-central1-YOUR-PROJECT.cloudfunctions.net/createStudyBuddyChallenge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Math","topic":"Algebra","difficulty":"medium"}'

# 2. Check response
{
  "success": true,
  "challenge": { "challengeId": "challenge_..." },
  "shareUrl": "https://messageai.app/studyBuddy?challengeId=..."
}
```

---

## 📊 Monitor

### Firebase Console
- **Firestore** → Check `/challenges` collection
- **Functions** → Monitor invocations, errors, latency
- **Logs** → Filter by "studyBuddy"

### Key Metrics
- Challenge creation time (target: <500ms)
- Completion rate (target: ≥40%)
- K-factor (target: ≥0.5)

---

## 🐛 Troubleshooting

### "Function not found"
```bash
# Re-deploy functions
cd functions
firebase deploy --only functions
```

### "Permission denied" in Firestore
```bash
# Re-deploy rules
firebase deploy --only firestore:rules
```

### "Challenge expired" error
- Challenge expires after 7 days
- Create new challenge or adjust `expiresAt` in code

### App crashes on share
- Check iOS/Android share permissions
- Verify `expo-linear-gradient` installed: `npx expo install expo-linear-gradient`

---

## 🎯 Success Checklist

- [X] Functions deployed successfully
- [X] Firestore rules updated
- [X] Feature flag enabled
- [X] App builds without errors
- [ ] Manual test passes (create → share → complete)
- [ ] Both users receive rewards
- [ ] Analytics events logged

---

## 📚 Full Documentation

- **Implementation Plan:** `PR23-IMPLEMENTATION-PLAN.md`
- **Testing Guide:** `PR23-TESTING-GUIDE.md`
- **Summary:** `PR23-SUMMARY.md`

---

**Need Help?** Check logs: `firebase functions:log --only createStudyBuddyChallenge`

