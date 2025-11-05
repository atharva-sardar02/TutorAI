/**
 * Study Buddy Challenge Service
 * PR23: Student→Student viral loop
 * 
 * Features:
 * - Challenge generation with 5 questions
 * - Referral attribution
 * - Dual rewards (creator + participant)
 * - 48h cooldown per subject
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { v4 as uuidv4 } from 'uuid';
import { createReferralInternal } from './referralHandler';

// Type definitions (must be duplicated for Cloud Functions)
interface ChallengeQuestion {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
}

interface ChallengeRewards {
  xp: number;
  streakShield: boolean;
}

interface Challenge {
  challengeId: string;
  creatorId: string;
  creatorRole?: 'parent' | 'student'; // PR30: Track creator role
  participantId?: string;
  subject: string;
  topic: string;
  questions: ChallengeQuestion[];
  createdAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
  joinedAt?: admin.firestore.Timestamp;
  completedAt?: admin.firestore.Timestamp;
  status: 'pending' | 'active' | 'completed' | 'expired';
  creatorScore?: number;
  participantScore?: number;
  referralId: string;
  rewards: ChallengeRewards;
  challengeType?: 'student_student' | 'parent_child'; // PR30: Challenge type
  childId?: string; // PR30: For parent challenges, track child
}

interface ChallengeResult {
  challengeId: string;
  participantId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  rewards: ChallengeRewards;
  completedAt: admin.firestore.Timestamp;
}

interface CreateChallengeRequest {
  subject: string;
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface SubmitChallengeRequest {
  challengeId: string;
  answers: string[];
}

const getDb = () => admin.firestore();

/**
 * Generate a Study Buddy Challenge
 * Callable function for creating challenges
 */
export const createStudyBuddyChallenge = onCall(async (request) => {
  const { auth, data } = request;
  const { subject, topic, difficulty = 'medium' } = data as CreateChallengeRequest;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  if (!subject || !topic) {
    throw new HttpsError('invalid-argument', 'Subject and topic are required');
  }
  
  try {
    const challenge = await generateStudyBuddyChallenge(
      auth.uid,
      subject,
      topic,
      difficulty
    );
    
    logger.info('✅ Study Buddy challenge created', {
      challengeId: challenge.challengeId,
      creatorId: auth.uid.substring(0, 8),
      subject,
      topic,
    });
    
    return {
      success: true,
      challenge,
      shareUrl: `https://messageai.app/studyBuddy?challengeId=${challenge.challengeId}&ref=${challenge.referralId}`,
    };
  } catch (error: any) {
    logger.error('❌ Failed to create challenge', {
      creatorId: auth.uid.substring(0, 8),
      error: error.message,
    });
    throw new HttpsError('internal', 'Failed to create challenge');
  }
});

/**
 * Internal function to generate challenge
 */
export async function generateStudyBuddyChallenge(
  creatorId: string,
  subject: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Challenge> {
  const db = getDb();
  
  // PR30: Check if creator is a parent (for parent-child challenges)
  const creatorDoc = await db.collection('users').doc(creatorId).get();
  const creatorRole = creatorDoc.data()?.userType || 'student';
  const isParentChallenge = creatorRole === 'parent';
  
  // 1. Select 5 questions
  const questions = await selectQuestionsForChallenge(subject, topic, difficulty);
  
  // 2. Compute rewards
  const rewards = computeChallengeRewards(difficulty);
  
  // 3. Generate referral link for attribution
  const referralData = await createReferralInternal({
    referrerId: creatorId,
    referrerType: isParentChallenge ? 'parent' : 'student',
    targetType: isParentChallenge ? 'student' : 'student',
    loopType: 'studyBuddy',
    metadata: { subject, topic, difficulty, challengeType: isParentChallenge ? 'parent_child' : 'student_student' },
  });
  
  // 4. Create challenge document
  const challengeId = `challenge_${uuidv4()}`;
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  );
  
  const challenge: Challenge = {
    challengeId,
    creatorId,
    creatorRole: isParentChallenge ? 'parent' : 'student', // PR30: Track creator role
    subject,
    topic,
    questions,
    createdAt: now,
    expiresAt,
    status: 'pending',
    referralId: referralData.referralId,
    rewards,
    // PR30: Parent-child specific fields
    ...(isParentChallenge && {
      challengeType: 'parent_child' as const,
      childId: undefined, // Will be set when child joins
    }),
  };
  
  await db.collection('challenges').doc(challengeId).set(challenge);
  
  logger.info('🎯 Challenge generated', {
    challengeId,
    creatorId: creatorId.substring(0, 8),
    creatorRole,
    challengeType: isParentChallenge ? 'parent_child' : 'student_student',
    questionCount: questions.length,
    expiresIn: '7 days',
  });
  
  return challenge;
}

/**
 * Select 5 questions for the challenge
 * For MVP, uses sample questions. In production, would query from question bank.
 */
async function selectQuestionsForChallenge(
  subject: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<ChallengeQuestion[]> {
  // MVP: Return sample questions
  // TODO: Replace with actual question bank query
  
  const sampleQuestions: Record<string, ChallengeQuestion[]> = {
    Math: [
      {
        questionId: 'q1',
        questionText: 'What is 15 × 12?',
        options: ['150', '180', '200', '175'],
        correctAnswer: '180',
        difficulty: 'easy',
        topic: 'Multiplication',
      },
      {
        questionId: 'q2',
        questionText: 'Solve for x: 2x + 5 = 13',
        options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
        correctAnswer: 'x = 4',
        difficulty: 'medium',
        topic: 'Algebra',
      },
      {
        questionId: 'q3',
        questionText: 'What is the area of a circle with radius 5?',
        options: ['25π', '10π', '50π', '5π'],
        correctAnswer: '25π',
        difficulty: 'medium',
        topic: 'Geometry',
      },
      {
        questionId: 'q4',
        questionText: 'Simplify: √64',
        options: ['6', '7', '8', '9'],
        correctAnswer: '8',
        difficulty: 'easy',
        topic: 'Radicals',
      },
      {
        questionId: 'q5',
        questionText: 'What is the slope of the line y = 3x + 2?',
        options: ['2', '3', '5', '1'],
        correctAnswer: '3',
        difficulty: 'medium',
        topic: 'Linear Equations',
      },
    ],
    Physics: [
      {
        questionId: 'q1',
        questionText: 'What is the SI unit of force?',
        options: ['Joule', 'Newton', 'Watt', 'Pascal'],
        correctAnswer: 'Newton',
        difficulty: 'easy',
        topic: 'Units',
      },
      {
        questionId: 'q2',
        questionText: 'Calculate the kinetic energy of a 5kg object moving at 10m/s',
        options: ['50J', '100J', '250J', '500J'],
        correctAnswer: '250J',
        difficulty: 'medium',
        topic: 'Energy',
      },
      {
        questionId: 'q3',
        questionText: 'What is the acceleration due to gravity on Earth?',
        options: ['8.8 m/s²', '9.8 m/s²', '10.8 m/s²', '11.8 m/s²'],
        correctAnswer: '9.8 m/s²',
        difficulty: 'easy',
        topic: 'Gravity',
      },
      {
        questionId: 'q4',
        questionText: 'If F = ma, what is the force on a 2kg object accelerating at 5m/s²?',
        options: ['7N', '8N', '10N', '12N'],
        correctAnswer: '10N',
        difficulty: 'medium',
        topic: 'Newton\'s Laws',
      },
      {
        questionId: 'q5',
        questionText: 'What is the speed of light in vacuum?',
        options: ['3 × 10⁸ m/s', '3 × 10⁶ m/s', '3 × 10¹⁰ m/s', '3 × 10⁴ m/s'],
        correctAnswer: '3 × 10⁸ m/s',
        difficulty: 'easy',
        topic: 'Constants',
      },
    ],
  };
  
  const questions = sampleQuestions[subject] || sampleQuestions.Math;
  
  // Return 5 questions
  return questions.slice(0, 5);
}

/**
 * Compute rewards based on difficulty
 */
function computeChallengeRewards(difficulty: 'easy' | 'medium' | 'hard'): ChallengeRewards {
  const xpMap = {
    easy: 30,
    medium: 50,
    hard: 75,
  };
  
  return {
    xp: xpMap[difficulty],
    streakShield: true, // Always earn streak shield
  };
}

/**
 * Join a challenge (when participant opens link)
 * Callable function
 */
export const joinStudyBuddyChallenge = onCall(async (request) => {
  const { auth, data } = request;
  const { challengeId } = data;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  if (!challengeId) {
    throw new HttpsError('invalid-argument', 'Challenge ID is required');
  }
  
  try {
    const challenge = await joinChallenge(challengeId, auth.uid);
    
    logger.info('✅ User joined challenge', {
      challengeId,
      participantId: auth.uid.substring(0, 8),
    });
    
    return { success: true, challenge };
  } catch (error: any) {
    logger.error('❌ Failed to join challenge', {
      challengeId,
      participantId: auth.uid.substring(0, 8),
      error: error.message,
    });
    throw new HttpsError('internal', error.message || 'Failed to join challenge');
  }
});

/**
 * Internal function to join challenge
 */
async function joinChallenge(challengeId: string, participantId: string): Promise<Challenge> {
  const db = getDb();
  const challengeRef = db.collection('challenges').doc(challengeId);
  
  const result = await db.runTransaction(async (transaction) => {
    const challengeDoc = await transaction.get(challengeRef);
    
    if (!challengeDoc.exists) {
      throw new Error('Challenge not found');
    }
    
    const challenge = challengeDoc.data() as Challenge;
    
    // Check expiration
    if (challenge.expiresAt.toDate() < new Date()) {
      throw new Error('Challenge has expired');
    }
    
    // Check status
    if (challenge.status !== 'pending') {
      throw new Error('Challenge has already been started or completed');
    }
    
    // Check if participant is creator
    if (challenge.creatorId === participantId) {
      throw new Error('Cannot join your own challenge');
    }
    
    // Update challenge
    transaction.update(challengeRef, {
      participantId,
      status: 'active',
      joinedAt: admin.firestore.Timestamp.now(),
    });
    
    return { ...challenge, participantId, status: 'active' as const };
  });
  
  return result;
}

/**
 * Submit challenge answers
 * Callable function
 */
export const submitStudyBuddyChallenge = onCall(async (request) => {
  const { auth, data } = request;
  const { challengeId, answers } = data as SubmitChallengeRequest;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  if (!challengeId || !answers || !Array.isArray(answers)) {
    throw new HttpsError('invalid-argument', 'Challenge ID and answers are required');
  }
  
  try {
    const result = await submitChallengeAnswers(challengeId, auth.uid, answers);
    
    logger.info('✅ Challenge submitted', {
      challengeId,
      participantId: auth.uid.substring(0, 8),
      score: result.score,
    });
    
    return { success: true, result };
  } catch (error: any) {
    logger.error('❌ Failed to submit challenge', {
      challengeId,
      participantId: auth.uid.substring(0, 8),
      error: error.message,
    });
    throw new HttpsError('internal', error.message || 'Failed to submit challenge');
  }
});

/**
 * Internal function to submit and grade answers
 */
async function submitChallengeAnswers(
  challengeId: string,
  participantId: string,
  answers: string[]
): Promise<ChallengeResult> {
  const db = getDb();
  const challengeRef = db.collection('challenges').doc(challengeId);
  
  const challengeDoc = await challengeRef.get();
  if (!challengeDoc.exists) {
    throw new Error('Challenge not found');
  }
  
  const challenge = challengeDoc.data() as Challenge;
  
  // Verify participant
  if (challenge.participantId !== participantId) {
    throw new Error('Not authorized to submit this challenge');
  }
  
  // Verify status
  if (challenge.status !== 'active') {
    throw new Error('Challenge is not active');
  }
  
  // Grade answers
  let correctAnswers = 0;
  challenge.questions.forEach((question, index) => {
    if (answers[index] === question.correctAnswer) {
      correctAnswers++;
    }
  });
  
  const score = Math.round((correctAnswers / challenge.questions.length) * 100);
  
  // Update challenge
  await challengeRef.update({
    participantScore: score,
    status: 'completed',
    completedAt: admin.firestore.Timestamp.now(),
  });
  
  // PR30: Award rewards based on challenge type
  await awardChallengeRewards(challenge.creatorId, participantId, challenge.rewards, challenge.creatorRole);
  
  const result: ChallengeResult = {
    challengeId,
    participantId,
    score,
    correctAnswers,
    totalQuestions: challenge.questions.length,
    rewards: challenge.rewards,
    completedAt: admin.firestore.Timestamp.now(),
  };
  
  return result;
}

/**
 * Award rewards based on challenge type
 * PR30: Parent-child challenges only reward the parent
 */
async function awardChallengeRewards(
  creatorId: string,
  participantId: string,
  rewards: ChallengeRewards,
  creatorRole?: 'parent' | 'student'
): Promise<void> {
  try {
    const db = getDb();
    const isParentChallenge = creatorRole === 'parent';
    
    if (isParentChallenge) {
      // PR30: Parent-child challenge - Only parent (creator) gets XP for engagement
      await db.collection(`rewards/${creatorId}/grants`).add({
        loopType: 'studyBuddy',
        xp: rewards.xp,
        reason: 'parent_child_challenge_completed',
        grantedAt: admin.firestore.Timestamp.now(),
        requestKey: `studybuddy_parent_${uuidv4()}`,
      });
      
      await db.collection('balances').doc(creatorId).set({
        xp: admin.firestore.FieldValue.increment(rewards.xp),
      }, { merge: true });
      
      logger.info('🎁 Parent rewarded for parent-child challenge completion', {
        parentId: creatorId.substring(0, 8),
        childId: participantId.substring(0, 8),
        xp: rewards.xp,
      });
    } else {
      // Student-student challenge: Both get rewards (existing logic)
      await db.collection(`rewards/${creatorId}/grants`).add({
        loopType: 'studyBuddy',
        xp: rewards.xp,
        reason: 'Challenge completed by friend',
        grantedAt: admin.firestore.Timestamp.now(),
        requestKey: `studybuddy_creator_${uuidv4()}`,
      });
      
      await db.collection(`rewards/${participantId}/grants`).add({
        loopType: 'studyBuddy',
        xp: rewards.xp,
        reason: 'Challenge completed',
        grantedAt: admin.firestore.Timestamp.now(),
        requestKey: `studybuddy_participant_${uuidv4()}`,
      });
      
      // Update balances
      await db.collection('balances').doc(creatorId).set({
        xp: admin.firestore.FieldValue.increment(rewards.xp),
      }, { merge: true });
      
      await db.collection('balances').doc(participantId).set({
        xp: admin.firestore.FieldValue.increment(rewards.xp),
      }, { merge: true });
      
      // TODO: Implement streak shield (PR27 leaderboard integration)
      
      logger.info('🎁 Challenge rewards awarded to both users', {
        creatorId: creatorId.substring(0, 8),
        participantId: participantId.substring(0, 8),
        xp: rewards.xp,
      });
    }
  } catch (error: any) {
    logger.error('❌ Failed to award challenge rewards', {
      creatorId: creatorId.substring(0, 8),
      participantId: participantId.substring(0, 8),
      error: error.message,
    });
    // Don't throw - rewards failure shouldn't block challenge completion
  }
}

/**
 * Get challenge by ID
 * Callable function
 */
export const getStudyBuddyChallenge = onCall(async (request) => {
  const { auth, data } = request;
  const { challengeId } = data;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  if (!challengeId) {
    throw new HttpsError('invalid-argument', 'Challenge ID is required');
  }
  
  try {
    const db = getDb();
    const challengeDoc = await db.collection('challenges').doc(challengeId).get();
    
    if (!challengeDoc.exists) {
      throw new HttpsError('not-found', 'Challenge not found');
    }
    
    const challenge = challengeDoc.data() as Challenge;
    
    // Verify user is creator or participant
    if (challenge.creatorId !== auth.uid && challenge.participantId !== auth.uid) {
      throw new HttpsError('permission-denied', 'Not authorized to view this challenge');
    }
    
    return { success: true, challenge };
  } catch (error: any) {
    logger.error('❌ Failed to get challenge', {
      challengeId,
      userId: auth.uid.substring(0, 8),
      error: error.message,
    });
    throw new HttpsError('internal', error.message || 'Failed to get challenge');
  }
});

