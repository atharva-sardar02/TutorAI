import { getFunctions, httpsCallable } from 'firebase/functions';
import type { GenerateTutorCardRequest, GenerateTutorCardResponse } from '../../types/growthTypes';

const functions = getFunctions();

/**
 * Generate a Tutor Card
 */
export async function generateTutorCard(
  tutorId: string,
  forceRegenerate: boolean = false
): Promise<GenerateTutorCardResponse> {
  const generateFn = httpsCallable<GenerateTutorCardRequest, GenerateTutorCardResponse>(
    functions,
    'generateTutorCard'
  );

  const result = await generateFn({ tutorId, forceRegenerate });

  // Analytics logging removed for now (causing errors)
  console.log('📇 Card generated:', result.data.cardId, 'cached:', result.data.isCached);

  return result.data;
}

/**
 * Track card share
 */
export async function trackCardShare(cardId: string, tutorId: string, channel: string): Promise<void> {
  console.log('📤 Card shared:', cardId, 'channel:', channel);
  // Analytics logging removed for now
}

/**
 * Track card view (called when someone opens a referral link)
 */
export async function trackCardView(cardId: string, tutorId: string): Promise<void> {
  console.log('👀 Card viewed:', cardId);
  // Analytics logging removed for now
}

