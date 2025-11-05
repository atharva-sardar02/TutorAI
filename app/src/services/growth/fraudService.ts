/**
 * Fraud Service - PR22
 * 
 * Frontend service for fraud detection and captcha verification
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

/**
 * Verify captcha token with backend
 */
export async function verifyCaptcha(token: string): Promise<void> {
  const callable = httpsCallable(functions, 'verifyCaptcha');
  await callable({ token });
}

