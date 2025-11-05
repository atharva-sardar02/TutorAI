/**
 * PR26: Micro-FVM Handler
 * 
 * 5-question quick assessment for guest users
 * Completes in <90 seconds, provides instant feedback
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getMicroFVMQuestions, sampleQuestions } from './microFVMQuestions';
import { logGrowthEvent } from './experimentService';

const getDb = () => admin.firestore();

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export const startMicroFVM = onCall({ timeoutSeconds: 10 }, async (request) => {
  const { data } = request;
  const { subject, referralId, guestId } = data;

  try {
    if (!subject || !['Math', 'Science', 'English'].includes(subject)) {
      throw new HttpsError('invalid-argument', 'Invalid subject');
    }

    const db = getDb();
    const allQuestions = getMicroFVMQuestions(subject);
    const selectedQuestions = sampleQuestions(allQuestions, 5);
    const sessionId = generateSessionId();
    const effectiveGuestId = guestId || generateGuestId();
    const userId = request.auth?.uid;

    const session = {
      sessionId,
      guestId: effectiveGuestId,
      userId: userId || null,
      subject,
      questions: selectedQuestions,
      answers: [],
      score: 0,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      referralId: referralId || null,
    };

    await db.collection('micro_fvm_sessions').doc(sessionId).set(session);
    await logGrowthEvent('microFVM_started', userId || effectiveGuestId, 'results', 'default', 'control', { subject });

    logger.info('Micro-FVM started', { sessionId: sessionId.substring(0, 15), subject });

    return {
      sessionId,
      guestId: effectiveGuestId,
      questions: selectedQuestions.map(q => ({
        questionId: q.questionId,
        text: q.text,
        options: q.options,
      })),
    };
  } catch (error: any) {
    logger.error('Failed to start micro-FVM', { error: error.message });
    if (error.code) throw error;
    throw new HttpsError('internal', `Failed: ${error.message}`);
  }
});

export const submitMicroFVM = onCall({ timeoutSeconds: 10 }, async (request) => {
  const { data } = request;
  const { sessionId, answers } = data;

  try {
    if (!sessionId) throw new HttpsError('invalid-argument', 'Session ID required');
    if (!Array.isArray(answers) || answers.length !== 5) {
      throw new HttpsError('invalid-argument', 'Must provide 5 answers');
    }

    const db = getDb();
    const sessionDoc = await db.collection('micro_fvm_sessions').doc(sessionId).get();

    if (!sessionDoc.exists) throw new HttpsError('not-found', 'Session not found');

    const session = sessionDoc.data();
    if (session?.completedAt) throw new HttpsError('failed-precondition', 'Already completed');

    const questions = session?.questions || [];
    let correctCount = 0;
    for (let i = 0; i < 5; i++) {
      if (answers[i] === questions[i]?.correctAnswer) correctCount++;
    }

    const score = (correctCount / 5) * 100;
    const startTime = session?.startedAt?.toMillis() || Date.now();
    const completionTime = Date.now() - startTime;

    await sessionDoc.ref.update({
      answers,
      score,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logGrowthEvent('microFVM_completed', session?.userId || session?.guestId, 'results', 'default', 'control', {
      score,
      completionTime,
      subject: session?.subject,
    });

    logger.info('Micro-FVM completed', { sessionId: sessionId.substring(0, 15), score });

    return { score, correctAnswers: correctCount, totalQuestions: 5 };
  } catch (error: any) {
    logger.error('Failed to submit micro-FVM', { error: error.message });
    if (error.code) throw error;
    throw new HttpsError('internal', `Failed: ${error.message}`);
  }
});

