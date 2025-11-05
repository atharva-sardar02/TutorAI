import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface TutorPeerReferralRequest {
  targetTutorEmail?: string;
  complementarySubject: string;
  personalMessage?: string;
}

interface TutorPeerReferralResponse {
  success: boolean;
  referralUrl: string;
  referralId: string;
  referrerName: string;
}

/**
 * Create a tutor peer referral link
 */
export async function createTutorPeerReferral(
  params: Omit<TutorPeerReferralRequest, 'targetTutorEmail'>
): Promise<TutorPeerReferralResponse> {
  const callable = httpsCallable<TutorPeerReferralRequest, TutorPeerReferralResponse>(
    functions,
    'createTutorPeerReferral'
  );
  
  const result = await callable(params);
  return result.data;
}

