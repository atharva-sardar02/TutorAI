/**
 * PR26: Micro-FVM Service
 * 
 * Frontend service for 5-question quick assessment
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
  StartMicroFVMRequest,
  StartMicroFVMResponse,
  SubmitMicroFVMRequest,
  SubmitMicroFVMResponse,
} from '@/types/growthTypes';

const functions = getFunctions();

/**
 * Start a micro-FVM assessment session
 * 
 * @param subject - Subject to test (Math, Science, English)
 * @param referralId - Optional referral ID for attribution
 * @param guestId - Optional guest ID (generated if not provided)
 * @returns Session ID and 5 questions
 */
export async function startMicroFVM(
  subject: string,
  referralId?: string,
  guestId?: string
): Promise<StartMicroFVMResponse> {
  const startFn = httpsCallable<StartMicroFVMRequest, StartMicroFVMResponse>(
    functions,
    'startMicroFVM'
  );

  const result = await startFn({
    subject,
    referralId,
    guestId,
  });

  console.log('🎯 Micro-FVM started:', {
    sessionId: result.data.sessionId.substring(0, 15),
    subject,
    questionCount: result.data.questions.length,
  });

  return result.data;
}

/**
 * Submit answers and get score
 * 
 * @param sessionId - Session ID from startMicroFVM
 * @param answers - Array of 5 answer indices (0-3)
 * @returns Score and results
 */
export async function submitMicroFVM(
  sessionId: string,
  answers: number[]
): Promise<SubmitMicroFVMResponse> {
  const submitFn = httpsCallable<SubmitMicroFVMRequest, SubmitMicroFVMResponse>(
    functions,
    'submitMicroFVM'
  );

  const result = await submitFn({
    sessionId,
    answers,
  });

  console.log('✅ Micro-FVM submitted:', {
    sessionId: sessionId.substring(0, 15),
    score: result.data.score,
    correct: result.data.correctAnswers,
  });

  return result.data;
}

/**
 * Track micro-FVM event
 */
export async function trackMicroFVMEvent(
  event: string,
  metadata: Record<string, any>
): Promise<void> {
  console.log('📊 Micro-FVM event:', event, metadata);
  // Events are logged on backend via logGrowthEvent
  // This is just for local tracking/debugging
}

