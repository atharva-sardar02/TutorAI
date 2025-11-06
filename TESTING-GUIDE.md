# 🧪 TutorAI Testing Guide - Viral Loops

## Quick Start - Testing on Your Phone

### Step 1: Seed Test Data

```bash
# Install dependencies
cd scripts
npm install

# Run the seeding script
node seed-test-data.js
```

This creates **4 test users** with realistic conversations, referrals, and activity.

---

## 📱 Test Users

| #  | Email               | Password | Role   | Name              | Purpose                          |
|----|---------------------|----------|--------|-------------------|----------------------------------|
| 1  | tutor1@test.com     | Test123! | Tutor  | Alex Chen         | Main tutor with multiple clients |
| 2  | tutor2@test.com     | Test123! | Tutor  | Maria Rodriguez   | Second tutor (essay coaching)    |
| 3  | parent1@test.com    | Test123! | Parent | Sarah Johnson     | Works with both tutors           |
| 4  | parent2@test.com    | Test123! | Parent | David Kim         | Referred by parent1              |

---

## 🎯 Test Scenarios by Viral Loop

### 1️⃣ Tutor Card Sharing (PR18)

**Test as: tutor1@test.com**

1. Open app and login
2. Go to Profile
3. Tap "Share Tutor Card"
4. See generated card with:
   - Photo, name, subjects
   - Stats (sessions, rating, etc.)
   - Referral code
5. Share via SMS/social media
6. **Verify:** Tracking in admin dashboard

**What to check:**
- Card generation works
- Deep link includes referral code
- Attribution tracked when someone clicks
- K-Factor updates in dashboard

---

### 2️⃣ Progress Reel (PR19)

**Test as: parent1@test.com**

1. Login and view conversations
2. Find conversation with tutor1 (Emma - SAT Math)
3. Tap on session recording (created by seed script)
4. View auto-generated summary
5. Tap "Share Progress Reel"
6. Grant consent (first time only)
7. See generated reel with highlights

**What to check:**
- Session recording exists
- Summary is displayed
- Consent flow works
- Reel generation successful
- Share tracking works

---

### 3️⃣ Session Intelligence Transcription (PR20)

**Test as: tutor1@test.com or parent1@test.com**

1. Open any conversation with recordings
2. Tap on session recording
3. View full transcript
4. Check summary quality
5. Verify timestamps match

**What to check:**
- Transcription exists and is readable
- Summary captures key points
- Can play back recording
- Timestamps are accurate

---

### 4️⃣ Activity Feed (PR21)

**Test as: any user**

1. Go to Activity/Feed tab
2. See recent events:
   - New messages
   - Session completions
   - Referral conversions
   - XP earnings
3. Pull to refresh
4. Tap on items to navigate

**What to check:**
- All activities visible
- Real-time updates work
- Correct timestamps
- Navigation to details works

---

### 5️⃣ Study Buddy Challenge (PR23)

**Test as: parent1@test.com**

1. Go to Study Buddy section
2. See parent2 (David Kim) in network
3. Initiate challenge:
   - "Most Sessions This Week"
   - "Highest XP Earned"
4. Set stakes/rewards
5. Track leaderboard

**What to check:**
- Can find other parents
- Challenge creation works
- XP tracking updates
- Leaderboard displays correctly
- Notifications sent

**Then test as: parent2@test.com**
- Accept challenge
- Complete activities
- See XP update in real-time

---

### 6️⃣ Parent Pod (PR24)

**Test as: parent1@test.com**

1. Go to Parent Pod section
2. Create new pod:
   - Name: "SAT Prep Parents"
   - Description: "Parents of kids doing SAT prep"
3. Invite parent2 (David Kim)
4. Post in pod:
   - "Anyone recommend good SAT practice tests?"
5. Share resource or tip

**Test as: parent2@test.com**
1. See pod invite notification
2. Accept invitation
3. View pod feed
4. Reply to parent1's post
5. Share your own tip

**What to check:**
- Pod creation works
- Invites send correctly
- Real-time messaging in pod
- Can share resources
- Notifications for new posts

---

### 7️⃣ Referral Attribution (PR15)

**Already seeded! Check:**

1. **As parent1:** 
   - Go to Profile → Referrals
   - See that parent2 (David Kim) joined via your link
   - See referral bonus XP credited

2. **Admin Dashboard:**
   - Login to admin dashboard
   - Go to Growth → Viral Loops
   - See parent1 → parent2 attribution
   - Check K-Factor updated

**What to check:**
- Referral tracked correctly
- Attribution source = "tutor_card"
- Conversion type = "first_session"
- XP reward given to referrer
- Dashboard shows in funnel

---

### 8️⃣ Weekly Reel Generation (PR25)

**Test as: tutor1@test.com**

1. Wait for Sunday evening (or trigger manually via Cloud Function)
2. Receive notification: "Your weekly reel is ready!"
3. Open notification
4. View auto-generated weekly reel:
   - Top moments from sessions
   - Progress highlights
   - Achievements
5. Share to social media

**Manual trigger (for testing):**
```bash
# Call cloud function directly
curl -X POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/generateWeeklyReel \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{"tutorId": "TUTOR1_UID"}'
```

**What to check:**
- Reel generated successfully
- Contains highlights from week
- Quality of content selection
- Share functionality works
- Attribution tracked

---

## 🔍 Verification Checklist

After testing each loop, verify in **Admin Dashboard**:

- [ ] User appears in Users list
- [ ] Referrals tracked in Growth → Viral Loops
- [ ] K-Factor updates correctly
- [ ] Funnel metrics show progression
- [ ] Session recordings appear in SI Analytics
- [ ] Activity events logged
- [ ] XP balances updated
- [ ] Notifications sent and received

---

## 🐛 Common Issues & Fixes

### Issue: No conversations showing
**Fix:** 
- Check Firestore rules allow read access
- Verify you're logged in as correct user
- Pull to refresh

### Issue: Can't share Tutor Card
**Fix:**
- Ensure user has complete profile
- Check deep link configuration in `app.json`
- Verify Cloud Function for card generation is deployed

### Issue: Session recordings not loading
**Fix:**
- Check Firebase Storage rules
- Verify recording files exist in Storage
- Check network connectivity

### Issue: Referrals not tracking
**Fix:**
- Verify Cloud Function `onReferralSignup` is deployed
- Check Firestore rules for `referrals` collection
- Look at Cloud Functions logs for errors

### Issue: XP not updating
**Fix:**
- Check Firestore rules for `balances` collection
- Verify Cloud Function for XP rewards is running
- Pull to refresh balance

---

## 📊 Expected Metrics (After Testing)

In the **Admin Dashboard**, you should see:

### Dashboard Overview
- **Total Users:** 4
- **Active Today:** 2-4 (depending on when you test)
- **Total Sessions:** 2+
- **Total Referrals:** 2

### K-Factor Dashboard
- **Overall K-Factor:** ~0.5 (2 referrals from 4 users)
- **Tutor Card:** 1 referral (tutor1 → tutor2)
- **Progress Reel:** 0-1 (depending on shares)
- **Study Buddy:** 0-1 (depending on challenges)
- **Parent Pod:** 0-1 (depending on invites)

### Funnel Metrics
- **Signed Up:** 4
- **Completed Profile:** 4
- **First Session:** 2
- **Made Referral:** 2
- **Active User:** 2-4

### Session Intelligence
- **Total Sessions:** 2
- **Transcribed:** 2
- **Avg Duration:** 45 min

---

## 🎬 Video Walkthrough (Recommended Order)

1. **Start with tutor1** - Generate Tutor Card, share it
2. **Switch to parent1** - View conversations, check Progress Reel
3. **Back to tutor1** - Check referral credited (parent2)
4. **Switch to parent2** - Accept Study Buddy challenge from parent1
5. **Both parents** - Create and interact in Parent Pod
6. **Admin Dashboard** - Review all metrics and tracking

---

## 🚀 Advanced Testing

### Test Real Referral Flow
1. Delete parent2 from Firebase Auth
2. As tutor1, share Tutor Card
3. Click link on different device
4. Sign up as new user
5. Verify attribution tracked

### Test Consent Revocation
1. Share Progress Reel with consent
2. Go to Settings → Privacy
3. Revoke consent
4. Verify reel sharing disabled
5. Check data removed per COPPA/FERPA

### Test Fraud Detection
1. Create multiple referrals from same IP
2. Check admin dashboard → Fraud Detection
3. Verify suspicious activity flagged
4. Test reward blocking

---

## 📝 Notes

- **Push Notifications:** Make sure FCM is configured and tokens are registered
- **Deep Links:** Test on real device, not simulator (some deep link issues)
- **Network:** Some features require real-time sync (use good WiFi)
- **Permissions:** Grant camera/mic for session recording
- **iOS vs Android:** Test on both if possible (some UI differences)

---

## 🎉 Success Criteria

You've successfully tested when:

✅ All 4 users can login  
✅ Conversations load with full message history  
✅ Tutor Card generates and shares correctly  
✅ Progress Reels can be viewed and shared  
✅ Session recordings have transcripts and summaries  
✅ Activity feed shows all events in real-time  
✅ Study Buddy challenges work end-to-end  
✅ Parent Pods support group communication  
✅ Referrals are tracked and attributed correctly  
✅ Admin dashboard shows all metrics accurately  

---

**Happy Testing! 🚀**

Questions? Check the README or review the seed script for data structure details.

