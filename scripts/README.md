# Test Data Seeding Scripts

## Overview

This directory contains scripts to populate your Firebase instance with realistic test data for testing the TutorAI mobile app and viral growth features.

## Files

- `seed-test-data.js` - Main seeding script that creates users, conversations, referrals, and activity

## Prerequisites

1. **Firebase Admin SDK Setup**
   ```bash
   npm install firebase-admin uuid
   ```

2. **Service Account Key**
   
   Option A: Use Application Default Credentials (recommended for local testing)
   ```bash
   # Login with Firebase CLI
   firebase login
   
   # Set default project
   firebase use YOUR_PROJECT_ID
   ```
   
   Option B: Use Service Account JSON
   ```bash
   # Download service account key from Firebase Console
   # Save as scripts/serviceAccountKey.json
   ```

## Usage

### Run the Seeding Script

```bash
# From project root
cd scripts
node seed-test-data.js
```

The script will:
1. Create 4 test users (2 tutors, 2 parents)
2. Link tutors and parents together
3. Create realistic conversations with messages
4. Set up referrals (for viral loop testing)
5. Create session recordings (for SI testing)
6. Schedule some events

### Test Users Created

| Role    | Email               | Password | Display Name      |
|---------|---------------------|----------|-------------------|
| Tutor   | tutor1@test.com     | Test123! | Alex Chen         |
| Tutor   | tutor2@test.com     | Test123! | Maria Rodriguez   |
| Parent  | parent1@test.com    | Test123! | Sarah Johnson     |
| Parent  | parent2@test.com    | Test123! | David Kim         |

### Test Scenarios

After seeding, you can test:

1. **Basic Messaging**
   - Login as tutor1 or parent1
   - View and interact with conversations

2. **Referral Attribution (PR15)**
   - parent1 referred parent2
   - Check referrals in admin dashboard

3. **Tutor Card (PR18)**
   - Login as tutor1
   - Generate and share Tutor Card
   - Verify tracking works

4. **Progress Reel (PR19)**
   - View session summaries
   - Test consent flow
   - Share progress reel

5. **Transcription (PR20)**
   - View existing session recordings
   - Check auto-generated summaries

6. **Activity Feed (PR21)**
   - See all recent activity
   - Test real-time updates

7. **Study Buddy Challenge (PR23)**
   - parent1 can challenge parent2
   - Track XP and leaderboard

8. **Parent Pod (PR24)**
   - parent1 invites parent2 to pod
   - Test group features

## Conversations Created

### 1. tutor1 ↔ parent1 (SAT Math)
- 8 messages over 24 hours
- Student: Emma Johnson
- Subject: SAT Math Prep
- Realistic back-and-forth about tutoring

### 2. tutor2 ↔ parent1 (College Essays)
- 7 messages
- Student: Emma Johnson
- Subject: College Essay Coaching
- Shows parent working with multiple tutors

### 3. tutor1 ↔ parent2 (SAT Math - Referred)
- 8 messages
- Student: Jason Kim
- Subject: SAT Math Prep
- parent2 mentions being referred by parent1

### 4. tutor1 ↔ tutor2 (Tutor-to-Tutor)
- 7 messages
- Professional collaboration
- Tests tutor-to-tutor viral loop

## Data Structure

```
Firestore Collections Created:
├── users/
│   ├── {tutor1_uid}
│   ├── {tutor2_uid}
│   ├── {parent1_uid}
│   └── {parent2_uid}
├── conversations/
│   ├── {conv1_id}
│   │   └── messages/
│   ├── {conv2_id}
│   │   └── messages/
│   ├── {conv3_id}
│   │   └── messages/
│   └── {conv4_id}
│       └── messages/
├── referrals/
│   ├── {parent1 → parent2}
│   └── {tutor1 → tutor2}
├── balances/
│   └── {user_id} (XP balances for all users)
├── session_recordings/
│   ├── {recording1}
│   └── {recording2}
└── events/
    └── {scheduled_event}
```

## Cleanup

To remove test data:

```bash
# WARNING: This will delete all test users and their data
firebase firestore:delete --all-collections --yes

# Or manually delete via Firebase Console
```

## Customization

Edit `seed-test-data.js` to:
- Add more users
- Create different conversation scenarios
- Adjust message content and timing
- Add more referrals or events

## Troubleshooting

### "Permission denied" error
- Ensure Firebase Admin SDK is properly initialized
- Check service account has correct permissions
- Verify you're using the correct project

### "User already exists" error
- Script handles this gracefully
- It will reuse existing users if email already exists

### Messages not showing in app
- Check Firestore security rules allow read access
- Verify user is authenticated
- Check presence data is correct

## Environment Variables

Optional environment variables:

```bash
# If using service account key file
export GOOGLE_APPLICATION_CREDENTIALS="./scripts/serviceAccountKey.json"

# Firebase project ID
export FIREBASE_PROJECT_ID="your-project-id"
```

## Next Steps

After seeding:
1. Open mobile app
2. Login with test credentials
3. Test all viral loops end-to-end
4. Check admin dashboard for metrics
5. Verify attribution tracking
6. Test referral flows

## Support

If you encounter issues:
1. Check Firebase Console for data
2. Verify Firestore security rules
3. Check Cloud Functions logs
4. Review app logs for errors

