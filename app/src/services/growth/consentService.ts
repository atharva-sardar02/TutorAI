/**
 * Consent Service
 * PR19: Progress Reels
 * 
 * Client-side consent management
 * Communicates with backend consent manager via Firestore
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

/**
 * Update user's progress sharing consent
 * 
 * @param granted - Whether consent is granted (true) or revoked (false)
 * @throws Error if user not authenticated
 */
export async function updateProgressSharingConsent(
  granted: boolean
): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  
  console.log(`${granted ? '✅' : '🚫'} Updating progress sharing consent`, {
    userId: userId.substring(0, 8),
    granted,
  });
  
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    'consents.progressSharing': granted,
    'consents.updatedAt': new Date(),
    [`consents.${granted ? 'grantedAt' : 'revokedAt'}`]: new Date(),
  });
  
  console.log('✅ Consent updated successfully');
}

/**
 * Check if user has granted progress sharing consent
 * 
 * @returns true if user has granted consent, false otherwise
 */
export async function checkProgressSharingConsent(): Promise<boolean> {
  const userId = auth.currentUser?.uid;
  if (!userId) return false;
  
  const userDoc = await getDoc(doc(db, 'users', userId));
  const userData = userDoc.data();
  
  const hasConsent = userData?.consents?.progressSharing === true;
  
  console.log('🔍 Progress sharing consent check', {
    userId: userId.substring(0, 8),
    hasConsent,
  });
  
  return hasConsent;
}

