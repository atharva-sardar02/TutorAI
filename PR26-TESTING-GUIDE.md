# PR26: Micro-FVM - Testing Guide

## Quick Test (5 minutes)

### Prerequisites
- iOS Simulator running
- App installed and logged in (or can test as guest)
- Firebase Console access

---

### Test 1: Start Micro-FVM (Math)

**Steps:**
1. Open the app
2. Import and use `MicroFVMScreen` component (see usage below)
3. Select subject: "Math"
4. Click "Start Assessment"

**Expected:**
- ✅ 5 questions load within 2 seconds
- ✅ Timer starts counting (00s, 01s, 02s...)
- ✅ Progress shows "Question 1 of 5"
- ✅ 4 answer options displayed (A, B, C, D)

**Console Logs:**
```
🎯 Micro-FVM started: session_... Math questionCount: 5
```

---

### Test 2: Answer Questions

**Steps:**
1. Select answer "B" for Question 1
2. Click "Next"
3. Select answer "C" for Question 2
4. Click "Next"
5. Continue until Question 5
6. Click "Submit" on last question

**Expected:**
- ✅ Selected answer highlights in blue
- ✅ "Next" button enabled after selection
- ✅ Progress updates: 2/5, 3/5, 4/5, 5/5
- ✅ Last button says "Submit" instead of "Next"
- ✅ Timer keeps running throughout

---

### Test 3: See Results

**Expected after submission:**
- ✅ "Grading your answers..." loading screen
- ✅ Score displayed (0-100)
- ✅ Correct answers shown (e.g., "3 out of 5 correct")

**Console Logs:**
```
✅ Micro-FVM submitted: session_... score: 60 correct: 3
```

---

### Test 4: Verify Firestore Data

**Steps:**
1. Open Firebase Console
2. Navigate to Firestore
3. Go to `/micro_fvm_sessions` collection
4. Find your session document

**Expected Fields:**
```json
{
  "sessionId": "session_1699920000_abc123",
  "guestId": "guest_1699920000_xyz789",
  "userId": null, // or your UID if authenticated
  "subject": "Math",
  "questions": [ /* 5 question objects */ ],
  "answers": [1, 2, 0, 3, 2], // Your answer indices
  "score": 60,
  "startedAt": Timestamp,
  "completedAt": Timestamp,
  "referralId": null
}
```

---

### Test 5: Test Different Subjects

**Test Science:**
1. Start new assessment with subject="Science"
2. Answer 5 questions
3. Verify different questions than Math

**Test English:**
1. Start new assessment with subject="English"
2. Answer 5 questions
3. Verify different questions than Math/Science

**Expected:**
- ✅ Each subject has different questions
- ✅ Questions are randomized (run multiple times)

---

### Test 6: Test Guest Flow (No Auth)

**Steps:**
1. Log out of the app
2. Start micro-FVM as guest
3. Complete assessment
4. Check Firestore

**Expected:**
- ✅ No authentication required
- ✅ Session created with `guestId` (no `userId`)
- ✅ Score displayed
- ✅ "Sign up to see full results" CTA shown

---

### Test 7: Test Timer (<90s Target)

**Steps:**
1. Start assessment
2. Answer all 5 questions quickly
3. Note timer value when you submit

**Expected:**
- ✅ Can complete in <90 seconds (MVP target)
- ✅ Timer displays correctly throughout
- ✅ Completion time logged in Firestore

---

## Integration Testing (Optional)

### Test Referral Attribution

**Steps:**
1. Create referral link with `referralId='test_ref_123'`
2. Start micro-FVM with that referralId
3. Complete assessment
4. Check Firestore session

**Expected:**
```json
{
  "referralId": "test_ref_123",
  "score": 80,
  ...
}
```

---

## Usage Example

To add micro-FVM to a screen:

```typescript
import { MicroFVMScreen } from '@/components/growth/MicroFVMScreen';
import { useState } from 'react';

export default function TestScreen() {
  const [showFVM, setShowFVM] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const handleComplete = (score: number) => {
    setResult(score);
    setShowFVM(false);
    Alert.alert('Score', `You scored ${score}%!`);
  };

  return (
    <View>
      <Button title="Start Math Assessment" onPress={() => setShowFVM(true)} />
      
      {showFVM && (
        <MicroFVMScreen
          subject="Math"
          onComplete={handleComplete}
          onCancel={() => setShowFVM(false)}
        />
      )}
    </View>
  );
}
```

---

## Troubleshooting

**Issue:** Questions don't load  
**Fix:** Check Cloud Functions logs, ensure `startMicroFVM` is deployed

**Issue:** Score shows 0% even with correct answers  
**Fix:** Check that answer indices match (0-3 for options A-D)

**Issue:** "Session not found" error  
**Fix:** Ensure sessionId is passed correctly to submitMicroFVM

**Issue:** Firestore permission denied  
**Fix:** Check firestore.rules, guests should be able to create sessions

---

## Analytics Verification

Check Firebase Console → Analytics → Events:

**Expected Events:**
1. `microFVM_started` - Fires when assessment starts
2. `microFVM_completed` - Fires when user submits

**Event Properties:**
- subject (Math/Science/English)
- score (0-100)
- completionTime (milliseconds)

---

## Performance Targets

✅ Questions load: <2s  
✅ Submit/grade: <1s  
✅ Total completion time: <90s (user-paced)  
✅ No client-side errors  

---

## Next Steps

After verifying PR26 works:
1. Add micro-FVM trigger to overview screen
2. Integrate with referral flow
3. Add "Sign up" CTA after completion
4. Track conversion funnel: start → complete → signup

---

**Status:** ✅ READY FOR TESTING  
**Version:** 1.0 - MVP (November 2025)

