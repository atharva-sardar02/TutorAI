# PR21: Activity Feed - Testing Guide

## Quick Test (10 minutes)

### Prerequisites
- Firebase project configured
- Cloud Functions deployed
- iOS Simulator or Android Emulator running
- App installed

---

## Test 1: Deploy Backend

### Step 1: Build and Deploy
```bash
cd /Users/tahmeedrahim/Projects/MessageAI/functions
npm run build

cd ..
firebase deploy --only functions:subjectPresenceAggregator
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Expected Output:
```
✔  Deploy complete!

Functions:
✔  subjectPresenceAggregator (us-central1)
```

### Step 2: Verify Function
```bash
firebase functions:list | grep subjectPresenceAggregator
```

**Expected:**
```
│ subjectPresenceAggregator   │ v2      │ scheduled                  │ us-central1 │ 256    │ nodejs20 │
```

---

## Test 2: Create Test Data

### In Firebase Console → Firestore

Create 3 test events with current timestamps:

#### Event 1: Math Session
```javascript
// Collection: events
// Document ID: test_math_1

{
  id: "test_math_1",
  title: "Math tutoring session",
  startTime: Timestamp.now(),
  endTime: Timestamp.fromDate(new Date(Date.now() + 3600000)), // +1 hour
  tutorId: "test_tutor_1",
  parentIds: ["test_parent_1"],
  participants: ["test_tutor_1", "test_parent_1"],
  status: "confirmed",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: "test_tutor_1"
}
```

#### Event 2: Physics Session
```javascript
// Collection: events
// Document ID: test_physics_1

{
  id: "test_physics_1",
  title: "Physics lesson",
  startTime: Timestamp.now(),
  endTime: Timestamp.fromDate(new Date(Date.now() + 3600000)),
  tutorId: "test_tutor_2",
  parentIds: ["test_parent_2"],
  participants: ["test_tutor_2", "test_parent_2"],
  status: "confirmed",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: "test_tutor_2"
}
```

#### Event 3: English Session
```javascript
// Collection: events
// Document ID: test_english_1

{
  id: "test_english_1",
  title: "English grammar review",
  startTime: Timestamp.now(),
  endTime: Timestamp.fromDate(new Date(Date.now() + 3600000)),
  tutorId: "test_tutor_3",
  parentIds: ["test_parent_3"],
  participants: ["test_tutor_3", "test_parent_3"],
  status: "confirmed",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: "test_tutor_3"
}
```

---

## Test 3: Wait for Aggregation

### Step 1: Check Function Logs
```bash
firebase functions:log --only subjectPresenceAggregator
```

**Expected (within 5 minutes):**
```
📊 Running subject presence aggregation
✅ Subject presence computed { subjects: ['Math', 'Physics', 'English'], totalActive: 3 }
```

### Step 2: Verify Firestore Data

In Firebase Console → Firestore → `presence/subjects/active`:

**Expected Collections:**
- `/presence/subjects/active/Math`
- `/presence/subjects/active/Physics`
- `/presence/subjects/active/English`

**Example Document (`Math`):**
```json
{
  "subject": "Math",
  "activeCount": 1,
  "activeTutorIds": ["test_tutor_1"],
  "updatedAt": Timestamp
}
```

---

## Test 4: Frontend - Activity Feed Display

### Step 1: Start App
```bash
cd app
npx expo start
```

### Step 2: Navigate to Overview Tab
- App should open to Overview tab by default
- If not, tap "Overview" in bottom navigation

### Step 3: Verify Feed Appears

**Expected at top of screen:**
```
🔥 Live Activity

[🔢]      [⚛️]      [📚]
  1         1         1
Math      Physics   English
sessions  sessions  sessions
active    active    active
now       now       now
```

**Visual Checks:**
- ✅ Title: "🔥 Live Activity"
- ✅ Horizontal scroll with 3 cards
- ✅ Cards show emoji, count, subject name
- ✅ White cards with shadows
- ✅ Cards are 140px wide

---

## Test 5: Frontend - Skeleton Loaders

### Step 1: Clear Firestore Cache
In app, shake device → "Debug" → "Clear Firestore Cache"

### Step 2: Reload Screen
Pull to refresh or navigate away and back

### Expected:
- ✅ 3 gray skeleton cards appear briefly
- ✅ Then real data loads
- ✅ Smooth transition

---

## Test 6: Frontend - Empty State

### Step 1: Delete Test Events
In Firebase Console → Firestore, delete all test events

### Step 2: Wait 5 Minutes
Wait for aggregation to run and clear presence data

### Step 3: Check App

**Expected:**
```
Live Activity

No active sessions right now
Check back soon!
```

---

## Test 7: Frontend - Detail Modal

### Step 1: Re-create Test Events
(Use Test 2 steps above)

### Step 2: Wait 5 Minutes for Aggregation

### Step 3: Tap Math Card

**Expected:**
- ✅ Modal slides up from bottom
- ✅ Header: "Math Sessions" with close button
- ✅ Description: "There are active Math tutoring sessions happening right now."
- ✅ Info box with lightbulb emoji
- ✅ "View Schedule" button (blue)
- ✅ "Close" button (gray)

### Step 4: Tap "View Schedule"

**Expected:**
- ✅ Modal closes
- ✅ App navigates to Schedule tab
- ✅ Schedule tab shows events

### Step 5: Go Back to Overview, Tap Another Subject Card

**Expected:**
- ✅ Modal opens for that subject
- ✅ Same flow works

---

## Test 8: Frontend - Real-time Updates

### Step 1: With App Open on Overview Tab

### Step 2: Add New Event in Firebase Console
```javascript
{
  id: "test_chemistry_1",
  title: "Chemistry lab session",
  startTime: Timestamp.now(),
  endTime: Timestamp.fromDate(new Date(Date.now() + 3600000)),
  tutorId: "test_tutor_4",
  // ... other required fields
}
```

### Step 3: Wait Max 5 Minutes

**Expected:**
- ✅ Feed automatically updates
- ✅ Chemistry card appears
- ✅ No app reload required
- ✅ Smooth animation

---

## Test 9: Error Handling

### Step 1: Disable Firestore Rules Temporarily
(Or test with no network)

### Expected:
- ✅ Feed disappears silently
- ✅ No error messages shown to user
- ✅ App continues to work normally
- ✅ Console shows error: "Activity feed error: ..."

---

## Test 10: Performance

### Step 1: Open App to Overview

### Step 2: Time Feed Load

**Expected:**
- ✅ Feed appears in <100ms after screen loads
- ✅ No lag or janky scrolling
- ✅ Horizontal scroll is smooth

### Step 3: Check Memory Usage

**Expected:**
- ✅ No memory leaks
- ✅ Real-time listener properly cleaned up on unmount

---

## Acceptance Criteria Checklist

### Backend
- [ ] Scheduled function runs every 5 minutes
- [ ] Aggregates stored in `/presence/subjects/active/{subject}`
- [ ] Keyword extraction maps titles correctly
- [ ] Firestore rules allow public read, block writes
- [ ] Function completes in <30s

### Frontend
- [ ] ActivityFeed renders at top of Overview screen
- [ ] Horizontal scroll shows all active subjects
- [ ] Cards display emoji + count + subject + "active now"
- [ ] Tap opens ActivityDetailModal
- [ ] Modal "View Schedule" button works
- [ ] Empty state shows when no sessions
- [ ] Skeleton loaders during initial load
- [ ] Feed updates automatically

### Performance
- [ ] Feed load time <100ms (P95)
- [ ] Zero UI blocking errors
- [ ] Graceful error fallback

### Feature Flag
- [ ] `activityFeed.enabled = true` in featureFlags.ts
- [ ] Can toggle to disable feed

---

## Common Issues

### Issue: Function Not Running
**Symptoms:** No logs in Cloud Functions
**Fix:** 
```bash
firebase deploy --only functions:subjectPresenceAggregator
firebase functions:log --only subjectPresenceAggregator
```

### Issue: Feed Shows "No active sessions" Despite Events
**Symptoms:** Events exist but feed empty
**Checks:**
1. Are events' startTime/endTime current?
2. Has 5 minutes passed for aggregation?
3. Check function logs for errors
4. Verify Firestore rules deployed

### Issue: Feed Not Updating
**Symptoms:** Feed stuck with old data
**Fix:**
1. Check Firestore listener is active
2. Verify no console errors
3. Try pull-to-refresh
4. Check network connection

### Issue: Modal Doesn't Open
**Symptoms:** Tap card, nothing happens
**Fix:**
1. Check console for errors
2. Verify import of ActivityDetailModal
3. Check React state management

---

## Cleanup

After testing, delete test events:

```bash
# In Firebase Console → Firestore
# Delete documents:
- events/test_math_1
- events/test_physics_1
- events/test_english_1
- events/test_chemistry_1

# Wait 5 min, presence aggregates will clear automatically
```

---

**Status:** ✅ READY FOR TESTING  
**Time Required:** 10-15 minutes  
**Next:** Production rollout after testing passes

