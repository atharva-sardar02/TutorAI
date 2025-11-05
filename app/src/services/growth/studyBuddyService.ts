/**
 * Study Buddy Challenge Service (Frontend)
 * PR23: Student→Student viral loop
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import {
  Challenge,
  ChallengeResult,
  CreateChallengeRequest,
  SubmitChallengeRequest,
} from '@/types/growthTypes';

const functions = getFunctions();
const db = getFirestore();

/**
 * Create a new study buddy challenge
 */
export async function createChallenge(
  subject: string,
  topic: string,
  difficulty?: 'easy' | 'medium' | 'hard'
): Promise<{ challenge: Challenge; shareUrl: string }> {
  const createFn = httpsCallable<CreateChallengeRequest, any>(
    functions,
    'createStudyBuddyChallenge'
  );
  
  try {
    const result = await createFn({ subject, topic, difficulty });
    
    if (!result.data.success) {
      throw new Error('Failed to create challenge');
    }
    
    console.log('✅ Challenge created:', result.data.challenge.challengeId);
    
    return {
      challenge: result.data.challenge,
      shareUrl: result.data.shareUrl,
    };
  } catch (error: any) {
    console.error('❌ Error creating challenge:', error);
    throw error;
  }
}

/**
 * Join an existing challenge (participant)
 */
export async function joinChallenge(challengeId: string): Promise<Challenge> {
  const joinFn = httpsCallable<{ challengeId: string }, any>(
    functions,
    'joinStudyBuddyChallenge'
  );
  
  try {
    const result = await joinFn({ challengeId });
    
    if (!result.data.success) {
      throw new Error('Failed to join challenge');
    }
    
    console.log('✅ Joined challenge:', challengeId);
    
    return result.data.challenge;
  } catch (error: any) {
    console.error('❌ Error joining challenge:', error);
    throw error;
  }
}

/**
 * Submit challenge answers
 */
export async function submitChallengeAnswers(
  challengeId: string,
  answers: string[]
): Promise<ChallengeResult> {
  const submitFn = httpsCallable<SubmitChallengeRequest, any>(
    functions,
    'submitStudyBuddyChallenge'
  );
  
  try {
    const result = await submitFn({ challengeId, answers });
    
    if (!result.data.success) {
      throw new Error('Failed to submit challenge');
    }
    
    console.log('✅ Challenge submitted:', challengeId);
    
    return result.data.result;
  } catch (error: any) {
    console.error('❌ Error submitting challenge:', error);
    throw error;
  }
}

/**
 * Get challenge by ID
 */
export async function getChallengeById(challengeId: string): Promise<Challenge> {
  const getFn = httpsCallable<{ challengeId: string }, any>(
    functions,
    'getStudyBuddyChallenge'
  );
  
  try {
    const result = await getFn({ challengeId });
    
    if (!result.data.success) {
      throw new Error('Challenge not found');
    }
    
    return result.data.challenge;
  } catch (error: any) {
    console.error('❌ Error getting challenge:', error);
    throw error;
  }
}

/**
 * Track challenge events (analytics stub)
 * TODO: Integrate with PR17 experimentation framework
 */
export async function trackChallengeEvent(
  event: string,
  challengeId: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Stub implementation - logs only for now
  console.log(`📊 Challenge event: ${event}`, {
    challengeId,
    metadata,
    timestamp: new Date().toISOString(),
  });
  
  // TODO: Write to /loop_exposures when PR17 is integrated
}

