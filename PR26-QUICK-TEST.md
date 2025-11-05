# PR26: Micro-FVM - Quick Test (2 Minutes)

## 🚀 Quick Start

### 1. Start the App
```bash
cd /Users/tahmeedrahim/Projects/MessageAI/app
npx expo start
```

### 2. Navigate to Test Screen
In your app, navigate to: `/testMicroFVM`

**Options:**
- Type `testMicroFVM` in the URL bar
- Add this temporary button to your index screen:
  ```typescript
  import { router } from 'expo-router';
  
  <TouchableOpacity onPress={() => router.push('/testMicroFVM')}>
    <Text>🎯 Test Micro-FVM</Text>
  </TouchableOpacity>
  ```

### 3. Run a Quick Test
1. Click **"Math Assessment"** button
2. Answer 5 multiple-choice questions
3. Watch the timer (try to finish <90s)
4. Click **Submit** on the last question
5. See your score!

### 4. Verify in Firebase
1. Open Firebase Console → Firestore
2. Go to `/micro_fvm_sessions` collection
3. Find your session (sorted by `startedAt`)
4. Verify fields: `sessionId`, `score`, `answers`, `completedAt`

---

## ✅ What to Check

- ✅ Questions load quickly (<2s)
- ✅ Timer starts and counts up
- ✅ Answer selection highlights in blue
- ✅ Progress shows "1 of 5", "2 of 5", etc.
- ✅ "Next" button only enabled after selecting answer
- ✅ Last question shows "Submit" instead of "Next"
- ✅ Score displays after submission (0-100%)
- ✅ Session saved in Firestore

---

## 🎯 Quick Commands

**Check if functions are deployed:**
```bash
cd functions
firebase functions:list | grep micro
```

**View function logs:**
```bash
firebase functions:log --only startMicroFVM,submitMicroFVM
```

**Redeploy if needed:**
```bash
cd functions
npm run build
firebase deploy --only functions:startMicroFVM,functions:submitMicroFVM
```

---

## 📊 Expected Output

### Console Logs (in app)
```
🎯 Micro-FVM started: session_... Math questionCount: 5
✅ Micro-FVM submitted: session_... score: 80 correct: 4
```

### Firestore Document
```json
{
  "sessionId": "session_1730764800_abc123",
  "guestId": "guest_1730764800_xyz789",
  "subject": "Math",
  "score": 80,
  "answers": [1, 2, 0, 3, 2],
  "questions": [/* 5 questions */],
  "startedAt": "2025-11-04T12:00:00Z",
  "completedAt": "2025-11-04T12:01:30Z"
}
```

---

## 🧪 Test All Subjects

1. **Math** - Algebra, percentages, geometry
2. **Science** - Photosynthesis, matter, cells
3. **English** - Grammar, vocabulary, punctuation

Each should have **different questions**.

---

## 🐛 Common Issues

**"Cannot find module '@/components/growth/MicroFVMScreen'"**
→ File exists. Restart Metro bundler: Press `r` in Expo

**"Function not found"**
→ Functions are deployed. Check: `firebase functions:list`

**Questions don't load**
→ Check Firebase logs: `firebase functions:log`

**Score shows 0% but I got answers right**
→ Answers are 0-indexed (0=A, 1=B, 2=C, 3=D)

---

## ✅ Done!

If all tests pass:
- ✅ Mark PR26 as tested
- ✅ Proceed to PR21 (Activity Feed)
- ✅ Document any issues in PR26-TEST-RESULTS.md

---

**Questions?** Check the full guide: `PR26-TESTING-GUIDE.md`

