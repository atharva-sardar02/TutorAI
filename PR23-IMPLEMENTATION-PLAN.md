# PR23: Study Buddy Challenge - Implementation Plan

**Status:** 🚧 PLANNING  
**Date:** November 4, 2025  
**Type:** Viral Loop (Student→Student)  
**Risk:** Low | **Effort:** M (3-5 days)

---

## 🎯 Overview

**Goal:** Enable students to challenge their friends to complete 5-question skill checks, earning rewards for both participants. This creates a Student→Student viral loop with social engagement and streak mechanics.

**Key Metrics:**
- Challenge creation <500ms (P95)
- 48h cooldown per subject (prevent spam)
- Completion rate tracked (funnel: sent → opened → completed)
- Streak rewards issued for both participants

**Dependencies:**
- ✅ PR15 (referral attribution)
- ✅ PR16 (loop orchestrator)
- ✅ PR20 (agentic actions)
- ✅ PR25 (rewards/incentives)

**Kill-Switch:** `growth.loops.studyBuddy.enabled`

---

## 📋 Technical Architecture

### Data Flow
```
Student A completes practice
  ↓
Action Analyzer detects challenge opportunity
  ↓
Orchestrator checks eligibility (role, cooldown)
  ↓
Challenge created with 5 questions
  ↓
Referral link generated
  ↓
Student A shares link
  ↓
Student B opens link (attribution tracked)
  ↓
Student B completes challenge
  ↓
Both students earn streak shields + XP
```

### Collections
```
/challenges/{challengeId}
  - challengeId: string
  - creatorId: string (Student A)
  - participantId?: string (Student B, after join)
  - subject: string
  - topic: string
  - questions: Question[] (5 items)
  - createdAt: Timestamp
  - expiresAt: Timestamp (7 days)
  - status: 'pending' | 'active' | 'completed' | 'expired'
  - creatorScore?: number
  - participantScore?: number
  - referralId: string (for attribution)
  - rewards: { xp: number, streakShield: boolean }

/loop_exposures/{userId}/{timestamp}
  - loopType: 'studyBuddy'
  - challengeId: string
  - action: 'created' | 'opened' | 'completed'
  - timestamp: Timestamp
```

---

## 🔧 Implementation Tasks

### Task 1: Backend - Challenge Generator
**File:** `functions/src/growth/studyBuddyService.ts` (NEW)

**Purpose:** Create challenge asset with 5 questions from student's recent practice

**Functions:**
1. `generateStudyBuddyChallenge(studentId, subject, topic)` → ChallengeData
2. `selectQuestionsForChallenge(studentId, subject)` → Question[] (5 items)
3. `computeChallengeRewards(difficulty)` → RewardConfig

**Logic:**
```typescript
export async function generateStudyBuddyChallenge(
  studentId: string,
  subject: string,
  topic: string
): Promise<Challenge> {
  // 1. Select 5 questions from recent practice
  const questions = await selectQuestionsForChallenge(studentId, subject);
  
  // 2. Compute rewards (XP + streak shield)
  const rewards = computeChallengeRewards('medium');
  
  // 3. Generate referral link
  const referralData = await createReferralInternal({
    referrerId: studentId,
    referrerType: 'student',
    targetType: 'student',
    loopType: 'studyBuddy',
    metadata: { subject, topic }
  });
  
  // 4. Create challenge document
  const challengeId = `challenge_${uuidv4()}`;
  const challenge: Challenge = {
    challengeId,
    creatorId: studentId,
    subject,
    topic,
    questions,
    createdAt: admin.firestore.Timestamp.now(),
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    ),
    status: 'pending',
    referralId: referralData.referralId,
    rewards
  };
  
  await db.collection('challenges').doc(challengeId).set(challenge);
  
  return challenge;
}
```

**Acceptance:**
- Challenge created <500ms
- 5 questions selected from appropriate difficulty
- Referral link embedded
- 7-day expiration set

---

### Task 2: Backend - Challenge Participation
**File:** `functions/src/growth/studyBuddyService.ts`

**Purpose:** Handle when Student B opens and completes challenge

**Functions:**
1. `joinChallenge(challengeId, participantId)` → Challenge
2. `submitChallengeAnswer(challengeId, participantId, answers)` → ChallengeResult
3. `awardChallengeRewards(challengeId)` → void

**Logic:**
```typescript
export async function joinChallenge(
  challengeId: string,
  participantId: string
): Promise<Challenge> {
  const challengeRef = db.collection('challenges').doc(challengeId);
  
  await db.runTransaction(async (transaction) => {
    const challengeDoc = await transaction.get(challengeRef);
    
    if (!challengeDoc.exists) {
      throw new Error('Challenge not found');
    }
    
    const challenge = challengeDoc.data() as Challenge;
    
    // Check expiration
    if (challenge.expiresAt.toDate() < new Date()) {
      throw new Error('Challenge expired');
    }
    
    // Check status
    if (challenge.status !== 'pending') {
      throw new Error('Challenge already started or completed');
    }
    
    // Update challenge
    transaction.update(challengeRef, {
      participantId,
      status: 'active',
      joinedAt: admin.firestore.Timestamp.now()
    });
  });
  
  // Track analytics
  await logLoopExposure({
    userId: participantId,
    loopType: 'studyBuddy',
    action: 'opened',
    challengeId
  });
  
  return (await challengeRef.get()).data() as Challenge;
}
```

**Acceptance:**
- Only one participant can join
- Expired challenges rejected
- Analytics tracked

---

### Task 3: Backend - Orchestrator Integration
**File:** `functions/src/growth/actionAnalyzer.ts` (MODIFY)

**Purpose:** Detect when to offer Study Buddy challenge

**Trigger Conditions:**
- User completes practice session
- User role = 'student'
- Practice score ≥ 70%
- Cooldown elapsed (48h per subject)
- Feature flag enabled

**Code Addition:**
```typescript
// In analyzeActions()
const studyBuddyEnabled = await isLoopEnabled('studyBuddy');
if (studyBuddyEnabled) {
  // Check cooldown
  const lastChallenge = await getLastChallengeTime(userId, subject);
  const cooldownElapsed = !lastChallenge || 
    (now.getTime() - lastChallenge.getTime()) > 48 * 60 * 60 * 1000;
  
  if (cooldownElapsed && sessionData.score >= 70) {
    opportunities.push({
      type: 'studyBuddy',
      priority: 7,
      rationale: `Student scored ${sessionData.score}% - eligible for peer challenge`,
      metadata: {
        subject: sessionData.subject,
        topic: sessionData.topic,
        score: sessionData.score
      }
    });
  }
}
```

**Acceptance:**
- Cooldown enforced (48h per subject)
- Only offered to students with good scores
- Orchestrator logs decision rationale

---

### Task 4: Frontend - Challenge Modal
**File:** `app/src/components/growth/StudyBuddyChallengeModal.tsx` (NEW)

**Purpose:** UI for creating and sharing challenge

**Features:**
- Preview challenge (5 questions, rewards)
- Share button (native sheet: WhatsApp, SMS, Email)
- "Challenge a Friend" CTA

**Component:**
```typescript
interface StudyBuddyChallengeModalProps {
  visible: boolean;
  challenge: Challenge | null;
  onClose: () => void;
  onShare: (challenge: Challenge) => void;
}

export function StudyBuddyChallengeModal({
  visible,
  challenge,
  onClose,
  onShare
}: StudyBuddyChallengeModalProps) {
  if (!challenge) return null;
  
  const handleShare = async () => {
    const shareUrl = `https://messageai.app/challenge/${challenge.challengeId}?ref=${challenge.referralId}`;
    
    try {
      await Share.share({
        message: `Beat my score! I just completed "${challenge.topic}" - can you do better? 🎯\n\n${shareUrl}`,
        title: 'Study Buddy Challenge'
      });
      
      // Track analytics
      await trackChallengeEvent('challenge_sent', challenge.challengeId);
      
      onShare(challenge);
    } catch (error) {
      console.error('Share failed:', error);
    }
  };
  
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <LinearGradient colors={['#4facfe', '#00f2fe']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Challenge a Friend</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.emoji}>🎯</Text>
            <Text style={styles.title}>Beat My Score!</Text>
            <Text style={styles.subtitle}>
              Challenge a friend to complete {challenge.questions.length} questions on {challenge.topic}
            </Text>
            
            <View style={styles.rewardsBox}>
              <Text style={styles.rewardsTitle}>Rewards for Both:</Text>
              <View style={styles.rewardItem}>
                <Ionicons name="star" size={20} color="#FFD700" />
                <Text style={styles.rewardText}>+{challenge.rewards.xp} XP</Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                <Text style={styles.rewardText}>Streak Shield (24h)</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social" size={20} color="white" />
              <Text style={styles.shareButtonText}>Send Challenge</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}
```

**Acceptance:**
- Modal renders <500ms
- Share works on iOS/Android
- Preview shows rewards clearly

---

### Task 5: Frontend - Challenge Screen (Participant View)
**File:** `app/src/components/growth/StudyBuddyChallengeScreen.tsx` (NEW)

**Purpose:** Display challenge for Student B (participant)

**Features:**
- Show challenge details (creator, topic, rewards)
- 5-question quiz interface
- Submit answers + show results
- Reward notification

**Route:** `app/app/studyBuddy.tsx`

```typescript
export default function StudyBuddyChallengeScreen() {
  const { challengeId } = useLocalSearchParams();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<string[]>([]);
  
  // Fetch challenge
  useEffect(() => {
    if (challengeId) {
      loadChallenge();
    }
  }, [challengeId]);
  
  async function loadChallenge() {
    try {
      const data = await getChallengeById(challengeId as string);
      setChallenge(data);
      
      // Join challenge (if first time)
      if (data.status === 'pending') {
        await joinChallenge(challengeId as string);
      }
    } catch (error) {
      console.error('Error loading challenge:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleSubmit() {
    if (!challenge) return;
    
    try {
      const result = await submitChallengeAnswers(
        challenge.challengeId,
        answers
      );
      
      // Show results + rewards
      Alert.alert(
        'Challenge Complete!',
        `You scored ${result.score}%\n\nRewards earned:\n+${challenge.rewards.xp} XP\n${challenge.rewards.streakShield ? '🛡️ Streak Shield' : ''}`,
        [{ text: 'Awesome!', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit answers. Please try again.');
    }
  }
  
  // ... render quiz UI ...
}
```

**Acceptance:**
- Quiz loads <1s
- Answer submission works
- Rewards displayed clearly

---

### Task 6: Backend - Cooldown Management
**File:** `functions/src/growth/loopOrchestrator.ts` (MODIFY)

**Purpose:** Enforce 48h cooldown per subject

**Logic:**
```typescript
async function checkStudyBuddyCooldown(
  userId: string,
  subject: string
): Promise<boolean> {
  const cooldownRef = db
    .collection('cooldowns')
    .doc(userId)
    .collection('loops')
    .doc(`studyBuddy_${subject}`);
  
  const cooldownDoc = await cooldownRef.get();
  
  if (!cooldownDoc.exists) {
    return true; // No cooldown, eligible
  }
  
  const lastCreated = cooldownDoc.data()?.lastCreatedAt as Timestamp;
  const now = Date.now();
  const cooldownMs = 48 * 60 * 60 * 1000; // 48 hours
  
  return (now - lastCreated.toMillis()) >= cooldownMs;
}

async function setStudyBuddyCooldown(
  userId: string,
  subject: string
): Promise<void> {
  const cooldownRef = db
    .collection('cooldowns')
    .doc(userId)
    .collection('loops')
    .doc(`studyBuddy_${subject}`);
  
  await cooldownRef.set({
    loopType: 'studyBuddy',
    subject,
    lastCreatedAt: admin.firestore.Timestamp.now()
  });
}
```

**Acceptance:**
- Cooldown tracked per subject
- 48h window enforced
- Zero duplicate challenges within window

---

### Task 7: TypeScript Types
**File:** `app/src/types/growthTypes.ts` (MODIFY)

**Add Challenge Interfaces:**
```typescript
export interface Challenge {
  challengeId: string;
  creatorId: string;
  participantId?: string;
  subject: string;
  topic: string;
  questions: ChallengeQuestion[];
  createdAt: Timestamp;
  expiresAt: Timestamp;
  joinedAt?: Timestamp;
  completedAt?: Timestamp;
  status: 'pending' | 'active' | 'completed' | 'expired';
  creatorScore?: number;
  participantScore?: number;
  referralId: string;
  rewards: ChallengeRewards;
}

export interface ChallengeQuestion {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ChallengeRewards {
  xp: number;
  streakShield: boolean;
}

export interface ChallengeResult {
  challengeId: string;
  participantId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  rewards: ChallengeRewards;
}
```

---

### Task 8: Firestore Rules & Indexes
**File:** `firestore.rules` (MODIFY)

**Add Challenge Rules:**
```javascript
// Challenges collection
match /challenges/{challengeId} {
  // Creator can read their own challenges
  allow read: if request.auth != null && 
    (resource.data.creatorId == request.auth.uid || 
     resource.data.participantId == request.auth.uid);
  
  // Only Cloud Functions can write
  allow write: if false;
}
```

**File:** `firestore.indexes.json` (MODIFY)

**Add Indexes:**
```json
{
  "collectionGroup": "challenges",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "creatorId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "challenges",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "expiresAt", "order": "ASCENDING" }
  ]
}
```

---

### Task 9: Analytics & Tracking
**File:** `app/src/services/growth/studyBuddyService.ts` (NEW)

**Events to Track:**
1. `challenge_created` - Creator generates challenge
2. `challenge_sent` - Creator shares link
3. `challenge_opened` - Participant opens link
4. `challenge_started` - Participant joins challenge
5. `challenge_completed` - Participant finishes quiz
6. `streak_earned` - Both users earn rewards

**Implementation:**
```typescript
export async function trackChallengeEvent(
  event: string,
  challengeId: string,
  metadata?: Record<string, any>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  
  await db.collection('loop_exposures').add({
    userId: user.uid,
    loopType: 'studyBuddy',
    event,
    challengeId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    metadata
  });
  
  console.log(`📊 Study Buddy event: ${event}`, { challengeId, metadata });
}
```

---

### Task 10: Feature Flag
**File:** `app/src/config/featureFlags.ts` (MODIFY)

**Add Study Buddy Flag:**
```typescript
loops: {
  tutorCard: { enabled: true },       // PR18 ✅
  progressReel: { enabled: true },    // PR19 ✅
  studyBuddy: { enabled: true },      // PR23 ✅ NEW
  parentPod: { enabled: false },      // PR24
  tutorPeer: { enabled: false },      // PR24
}
```

---

## 🧪 Testing Strategy

### Unit Tests
**File:** `functions/__tests__/studyBuddyService.test.ts` (NEW)

```typescript
describe('Study Buddy Challenge', () => {
  test('generates challenge with 5 questions', async () => {
    const challenge = await generateStudyBuddyChallenge(
      'student_123',
      'Math',
      'Algebra'
    );
    
    expect(challenge.questions).toHaveLength(5);
    expect(challenge.subject).toBe('Math');
    expect(challenge.status).toBe('pending');
  });
  
  test('enforces 48h cooldown per subject', async () => {
    await setStudyBuddyCooldown('student_123', 'Math');
    const eligible = await checkStudyBuddyCooldown('student_123', 'Math');
    
    expect(eligible).toBe(false);
  });
  
  test('only one participant can join challenge', async () => {
    const challenge = await generateStudyBuddyChallenge(...);
    await joinChallenge(challenge.challengeId, 'student_456');
    
    await expect(
      joinChallenge(challenge.challengeId, 'student_789')
    ).rejects.toThrow('Challenge already started');
  });
});
```

### Integration Tests
**File:** `app/__tests__/integration/studyBuddy.e2e.test.ts` (NEW)

```typescript
describe('Study Buddy E2E', () => {
  test('complete challenge flow', async () => {
    // 1. Student A completes practice
    // 2. Challenge modal appears
    // 3. Student A shares link
    // 4. Student B opens link
    // 5. Student B completes challenge
    // 6. Both receive rewards
    
    // Mock Firebase functions
    // Assert: Analytics events tracked
    // Assert: Rewards issued
  });
});
```

### Manual Testing Checklist
- [ ] Create challenge as Student A
- [ ] Share challenge via WhatsApp
- [ ] Open challenge as Student B
- [ ] Complete quiz
- [ ] Verify both students receive rewards
- [ ] Verify 48h cooldown prevents spam
- [ ] Test expired challenge rejection
- [ ] Test feature flag toggle

---

## 📊 Success Metrics

**Performance:**
- [ ] Challenge creation <500ms (P95)
- [ ] Quiz loading <1s
- [ ] Answer submission <300ms

**Engagement:**
- [ ] Track completion rate (opened → completed)
- [ ] Target: ≥40% completion rate
- [ ] Track rewards claimed

**Viral Coefficient:**
- [ ] Track K-factor: (challenges sent/student) × (completions/challenge)
- [ ] Target: K ≥ 0.5 (each challenge brings 0.5 new users on average)

**Quality:**
- [ ] Zero spam (cooldown enforced)
- [ ] Zero duplicate rewards
- [ ] 100% attribution accuracy

---

## 🚀 Rollout Plan

### Phase 1: Development (Day 1-2)
- Implement backend (studyBuddyService, orchestrator integration)
- Implement frontend (modal, screen, service)
- Add types, rules, indexes

### Phase 2: Testing (Day 3)
- Unit tests
- Integration tests
- Manual testing

### Phase 3: Staging Deploy (Day 4)
- Deploy to staging
- QA testing
- Fix bugs

### Phase 4: Production (Day 5)
- Deploy with flag disabled
- Enable for 5% of students
- Monitor metrics for 24h
- Ramp to 100% if healthy

---

## 🔧 Dependencies & Integration Points

### Depends On:
- ✅ PR15 (referral attribution)
- ✅ PR16 (orchestrator)
- ✅ PR20 (action analyzer)
- ✅ PR25 (rewards)

### Integrates With:
- Action Analyzer - Detects challenge opportunities
- Orchestrator - Checks eligibility + cooldowns
- Referral Service - Generates attribution links
- Incentives Agent - Issues rewards

### Enables:
- PR30 (Second Student Loop - can reuse challenge infrastructure)

---

## 📝 Files to Create/Modify

### New Files (8)
1. `functions/src/growth/studyBuddyService.ts` - Challenge logic
2. `app/src/components/growth/StudyBuddyChallengeModal.tsx` - Creator UI
3. `app/src/components/growth/StudyBuddyChallengeScreen.tsx` - Participant UI
4. `app/src/services/growth/studyBuddyService.ts` - Frontend service
5. `app/app/studyBuddy.tsx` - Route screen
6. `functions/__tests__/studyBuddyService.test.ts` - Unit tests
7. `app/__tests__/integration/studyBuddy.e2e.test.ts` - E2E tests
8. `PR23-SUMMARY.md` - Post-implementation summary

### Modified Files (7)
1. `functions/src/growth/actionAnalyzer.ts` - Add studyBuddy opportunity detection
2. `functions/src/growth/actionExecutor.ts` - Add executeStudyBuddy()
3. `functions/src/growth/loopOrchestrator.ts` - Add cooldown checks
4. `functions/src/index.ts` - Export new functions
5. `app/src/types/growthTypes.ts` - Add Challenge interfaces
6. `app/src/config/featureFlags.ts` - Enable studyBuddy flag
7. `firestore.rules` - Add challenge rules
8. `firestore.indexes.json` - Add challenge indexes

---

## ⚠️ Risk Mitigation

**Risk 1: Question Quality**
- **Mitigation:** Curate questions from existing practice decks, ensure diversity
- **Fallback:** If no suitable questions, skip challenge offer

**Risk 2: Cooldown Bypass**
- **Mitigation:** Server-side enforcement, atomic check-and-set
- **Monitoring:** Alert if >10 challenges/day per user

**Risk 3: Reward Abuse**
- **Mitigation:** Integrate with PR22 fraud detection
- **Monitoring:** Track suspicious patterns (same device, rapid completions)

**Risk 4: Low Completion Rate**
- **Mitigation:** Clear rewards preview, push notification reminders
- **Iteration:** A/B test reward amounts to optimize

---

## ✅ Acceptance Criteria Summary

- [ ] Challenge created <500ms
- [ ] 48h cooldown enforced per subject
- [ ] Referral attribution tracked
- [ ] Both students receive rewards
- [ ] Analytics events logged (100% coverage)
- [ ] Feature flag works (<60s toggle)
- [ ] No duplicate challenges within cooldown
- [ ] Expired challenges rejected
- [ ] Zero spam (velocity checks pass)
- [ ] Unit tests pass (≥80% coverage)
- [ ] E2E tests pass
- [ ] Manual testing complete

---

**Created by:** AI Assistant  
**Reviewed by:** Awaiting team review  
**Ready for:** Implementation

