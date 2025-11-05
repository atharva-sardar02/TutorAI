import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface ParentPodInviteRequest {
  cohortId: string;
  cohortName: string;
}

interface ParentPodInviteResponse {
  success: boolean;
  inviteUrl: string;
  referralId: string;
  cohortId: string;
  cohortName: string;
}

/**
 * Create a parent pod invite link for a cohort
 */
export async function createParentPodInvite(
  cohortId: string,
  cohortName: string
): Promise<ParentPodInviteResponse> {
  const callable = httpsCallable<ParentPodInviteRequest, ParentPodInviteResponse>(
    functions,
    'createParentPodInvite'
  );
  
  const result = await callable({ cohortId, cohortName });
  return result.data;
}

