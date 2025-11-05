## Overview Build shareable results pages for diagnostics/practice with OG card generation, create a 5-question micro-FVM (First Value Moment) for guest users that completes in <90s, add cohort results variant for teachers/tutors, and implement install-deferred context hydration for attribution. ## Current Dependencies - ✅ PR15 (Referral Attribution) - ✅ PR16 (Loop Orchestrator) - ✅ PR17.5 (Personalization) ## Scope Clarification Questions Before implementing, we need to clarify: 1. **Question Types:** - Should micro-FVM questions be multiple choice, open-ended, or mixed? - Default: Multiple choice (easiest to auto-grade, completes fastest) 2. **Question Generation:** - Hardcoded question bank per subject? - AI-generated questions (requires GPT-4)? - Pre-seeded questions in Firestore? - Default: Pre-seeded questions in Firestore (5 questions × 3 subjects = 15 total) 3. **Results Data:** - Do we have existing diagnostic/practice results to share? - Or is this building the results system from scratch? - Default: Build minimal results system (score + subject breakdown) 4. **Cohort Leaderboards:** - PR27 (Cohort Rooms + Leaderboards) is not yet implemented - Should we create a simple cohort results view now, or wait for PR27? - Default: Create simple cohort results stub (full leaderboard in PR27) ## Implementation Steps ### Step 1: Results Data Schema (Backend) **File:** app/src/types/growthTypes.ts Add interfaces for results:
typescript
export interface PracticeResult {
  resultId: string;
  userId: string;
  type: 'diagnostic' | 'practice' | 'skill-check';
  subject: string;
  score: number;              // 0-100
  totalQuestions: number;
  correctAnswers: number;
  skillsBreakdown?: {         // Optional heatmap
    [skill: string]: number;  // e.g., { "algebra": 80, "geometry": 65 }
  };
  recommendations?: string[];
  completedAt: Timestamp;
  sharedAt?: Timestamp;
  shareCount: number;
}

export interface MicroFVMQuestion {
  questionId: string;
  subject: string;            // 'Math', 'Science', 'English'
  skill: string;              // 'Algebra Basics', 'Photosynthesis', etc.
  text: string;
  options: string[];          // 4 multiple choice options
  correctAnswer: number;      // Index of correct option (0-3)
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface MicroFVMSession {
  sessionId: string;
  userId?: string;            // null for guest users
  guestId?: string;           // For unauthenticated users
  subject: string;
  questions: MicroFVMQuestion[];
  answers: number[];          // User's selected answers
  score: number;              // 0-100
  completedAt?: Timestamp;
  startedAt: Timestamp;
  referralId?: string;        // Attribution
}
**Acceptance:** Types defined, compilable --- ### Step 2: Seed Micro-FVM Questions (Backend) **File:** functions/src/growth/microFVMQuestions.ts (NEW) Create hardcoded question bank:
typescript
export const MICRO_FVM_QUESTIONS: Record<string, MicroFVMQuestion[]> = {
  Math: [
    {
      questionId: 'math_001',
      subject: 'Math',
      skill: 'Algebra Basics',
      text: 'Solve for x: 2x + 5 = 13',
      options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
      correctAnswer: 1,
      difficulty: 'easy',
    },
    // ... 4 more Math questions
  ],
  Science: [
    // ... 5 Science questions
  ],
  English: [
    // ... 5 English questions
  ],
};

export function getMicroFVMQuestions(subject: string): MicroFVMQuestion[] {
  return MICRO_FVM_QUESTIONS[subject] || MICRO_FVM_QUESTIONS['Math'];
}
**Acceptance:** 15 total questions (5 per subject) --- ### Step 3: Cloud Function - Generate Results Card (Backend) **File:** functions/src/growth/generateResultsCard.ts (NEW) Create Open Graph card generator:
typescript
export const generateResultsCard = onCall(async (request) => {
  const { auth, data } = request;
  const { resultId } = data;

  // 1. Fetch result from Firestore
  const result = await db.doc(`practice_results/${resultId}`).get();
  
  // 2. Redact PII (student names, school names)
  const sanitizedResult = redactPII(result.data());
  
  // 3. Create referral link
  const referralResult = await createReferralInternal({
    referrerId: auth.uid,
    referrerType: userData.role,
    loopType: 'results',
    metadata: { resultId },
  });
  
  // 4. Generate OG card image (use DiceBear or Cloudinary)
  const cardImageUrl = await generateOGCardImage(sanitizedResult);
  
  // 5. Store card metadata
  await db.doc(`results_cards/${resultId}`).set({
    resultId,
    userId: auth.uid,
    score: sanitizedResult.score,
    subject: sanitizedResult.subject,
    imageUrl: cardImageUrl,
    referralLink: referralResult.url,
    createdAt: serverTimestamp(),
  });
  
  return {
    cardId: resultId,
    imageUrl: cardImageUrl,
    referralLink: referralResult.url,
  };
});
**Acceptance:** Cards generated <2s, OG tags work --- ### Step 4: Cloud Function - Start Micro-FVM (Backend) **File:** functions/src/growth/startMicroFVM.ts (NEW)
typescript
export const startMicroFVM = onCall(async (request) => {
  const { data } = request;
  const { subject, referralId, guestId } = data;
  
  // 1. Get 5 random questions for subject
  const allQuestions = getMicroFVMQuestions(subject);
  const selectedQuestions = sampleQuestions(allQuestions, 5);
  
  // 2. Create session
  const sessionId = generateSessionId();
  await db.doc(`micro_fvm_sessions/${sessionId}`).set({
    sessionId,
    guestId: guestId || generateGuestId(),
    userId: request.auth?.uid,
    subject,
    questions: selectedQuestions.map(q => ({
      ...q,
      correctAnswer: undefined, // Don't send answer to client
    })),
    answers: [],
    startedAt: serverTimestamp(),
    referralId,
  });
  
  return {
    sessionId,
    questions: selectedQuestions.map(q => ({
      questionId: q.questionId,
      text: q.text,
      options: q.options,
    })),
  };
});
**Acceptance:** Questions generated <500ms --- ### Step 5: Cloud Function - Submit Micro-FVM (Backend) **File:** functions/src/growth/submitMicroFVM.ts (NEW)
typescript
export const submitMicroFVM = onCall(async (request) => {
  const { data } = request;
  const { sessionId, answers } = data;
  
  // 1. Fetch session
  const sessionDoc = await db.doc(`micro_fvm_sessions/${sessionId}`).get();
  const session = sessionDoc.data();
  
  // 2. Grade answers
  const questions = await getFullQuestions(session.subject);
  const score = gradeAnswers(questions, answers);
  
  // 3. Update session
  await sessionDoc.ref.update({
    answers,
    score,
    completedAt: serverTimestamp(),
  });
  
  // 4. Track completion time
  const completionTime = Date.now() - session.startedAt.toMillis();
  
  // 5. Log analytics
  await logGrowthEvent('microFVM_completed', session.userId, 'results', 'default', 'control', {
    score,
    completionTime,
    subject: session.subject,
  });
  
  return {
    score,
    correctAnswers: score / 20, // 5 questions = 20 points each
    totalQuestions: 5,
  };
});
**Acceptance:** Grading completes <200ms --- ### Step 6: Frontend - Micro-FVM Screen (Frontend) **File:** app/src/components/growth/MicroFVMScreen.tsx (NEW)
typescript
export function MicroFVMScreen({ route, navigation }) {
  const { subject, referralId } = route.params;
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    startSession();
  }, []);
  
  const startSession = async () => {
    const result = await startMicroFVM(subject, referralId);
    setSession(result);
    setLoading(false);
  };
  
  const selectAnswer = (answerIndex) => {
    setAnswers([...answers, answerIndex]);
    if (currentQuestion < 4) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitSession();
    }
  };
  
  const submitSession = async () => {
    const result = await submitMicroFVM(session.sessionId, answers);
    navigation.navigate('MicroFVMResults', { ...result });
  };
  
  // Render question + 4 options
  // Timer (target: <90s total)
  // Progress bar (1/5, 2/5, etc.)
}
**Acceptance:** Guest completes <90s --- ### Step 7: Results Share Modal (Frontend) **File:** app/src/components/growth/ResultsShareModal.tsx (NEW)
typescript
export function ResultsShareModal({ visible, resultId, onClose }) {
  const [cardData, setCardData] = useState(null);
  
  useEffect(() => {
    if (visible) loadCard();
  }, [visible]);
  
  const loadCard = async () => {
    const result = await generateResultsCard(resultId);
    setCardData(result);
  };
  
  const handleShare = async () => {
    await Share.share({
      message: `Check out my results! ${cardData.referralLink}`,
      url: cardData.imageUrl,
      title: 'My Practice Results',
    });
    
    await trackCardShare(resultId, 'results');
  };
  
  // Similar to TutorCardModal
  // Show OG card image, share button
}
**Acceptance:** Share works on iOS/Android --- ### Step 8: Install-Deferred Context (Backend) **File:** functions/src/growth/referralHandler.ts (UPDATE) Extend referral metadata to store context:
typescript
// In createReferralInternal:
metadata: {
  ...metadata,
  deferredContext: {
    type: 'result' | 'cohort' | 'microFVM',
    contextId: metadata.resultId || metadata.cohortId || metadata.sessionId,
  },
}
**File:** app/src/services/growth/referralService.ts (UPDATE) After signup, hydrate context:
typescript
export async function hydrateReferralContext() {
  const referralId = await AsyncStorage.getItem('pending_referral_id');
  if (!referralId) return;
  
  // Fetch referral metadata
  const referral = await db.doc(`referrals/${referralId}`).get();
  const context = referral.data().metadata.deferredContext;
  
  if (context.type === 'result') {
    // Navigate to result page
    navigation.navigate('ResultDetail', { resultId: context.contextId });
  } else if (context.type === 'microFVM') {
    // Show completed micro-FVM
    navigation.navigate('MicroFVMResults', { sessionId: context.contextId });
  }
}
**Acceptance:** Context preserved across install --- ### Step 9: Cohort Results Stub (Frontend) **File:** app/src/components/growth/CohortResultsCard.tsx (NEW) Simple placeholder until PR27:
typescript
export function CohortResultsCard({ cohortId }) {
  return (
    <View>
      <Text>Cohort Results</Text>
      <Text>Coming soon: Full leaderboard in PR27</Text>
      <Text>Cohort ID: {cohortId}</Text>
    </View>
  );
}
**Acceptance:** Renders without errors --- ### Step 10: Feature Flags & Analytics **File:** app/src/config/featureFlags.ts
typescript
loops: {
  tutorCard: { enabled: true },
  progressReel: { enabled: false },
  studyBuddy: { enabled: false },
  parentPod: { enabled: false },
  tutorPeer: { enabled: false },
  results: { enabled: true },  // NEW
  microFVM: { enabled: true },  // NEW
}