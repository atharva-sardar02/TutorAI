/**
 * Fraud Queue - PR22
 * 
 * Manages fraud review queue for admin review and user banning
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { AnomalyScore } from './anomalyDetector';

const getDb = () => admin.firestore();

export interface FraudQueueItem {
  queueId: string;
  referralId: string;
  userId: string;
  anomalyScore: AnomalyScore;
  status: 'pending' | 'approved' | 'rejected' | 'banned';
  reviewedBy?: string;
  reviewedAt?: admin.firestore.Timestamp;
  reviewNotes?: string;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Add referral to fraud review queue
 */
export async function queueForReview(
  referralId: string,
  userId: string,
  anomalyScore: AnomalyScore
): Promise<void> {
  const db = getDb();
  const queueId = `fraud_${Date.now()}_${referralId}`;
  
  const item: FraudQueueItem = {
    queueId,
    referralId,
    userId,
    anomalyScore,
    status: 'pending',
    createdAt: admin.firestore.Timestamp.now(),
  };
  
  await db.collection('fraud_queue').doc(queueId).set(item);
  
  logger.info('🚨 Referral queued for review', {
    referralId: referralId.substring(0, 8),
    userId: userId.substring(0, 8),
    score: anomalyScore.score,
  });
}

/**
 * Admin: Approve fraud queue item
 */
export const approveFraudItem = onCall(async (request) => {
  const { auth, data } = request;
  const { queueId, notes } = data;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Admin authentication required');
  }
  
  // TODO: Add admin role check when admin roles are implemented
  
  const db = getDb();
  
  await db.collection('fraud_queue').doc(queueId).update({
    status: 'approved',
    reviewedBy: auth.uid,
    reviewedAt: admin.firestore.Timestamp.now(),
    reviewNotes: notes || '',
  });
  
  logger.info('✅ Fraud item approved', {
    queueId,
    reviewedBy: auth.uid.substring(0, 8),
  });
  
  return { success: true };
});

/**
 * Admin: Reject fraud queue item (and ban user if severe)
 */
export const rejectFraudItem = onCall(async (request) => {
  const { auth, data } = request;
  const { queueId, banUser, notes } = data;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Admin authentication required');
  }
  
  // TODO: Add admin role check when admin roles are implemented
  
  const db = getDb();
  const queueDoc = await db.collection('fraud_queue').doc(queueId).get();
  
  if (!queueDoc.exists) {
    throw new HttpsError('not-found', 'Queue item not found');
  }
  
  const queueData = queueDoc.data() as FraudQueueItem;
  
  await db.collection('fraud_queue').doc(queueId).update({
    status: banUser ? 'banned' : 'rejected',
    reviewedBy: auth.uid,
    reviewedAt: admin.firestore.Timestamp.now(),
    reviewNotes: notes || '',
  });
  
  // Ban user if requested
  if (banUser) {
    await db.collection('banned_users').doc(queueData.userId).set({
      bannedAt: admin.firestore.Timestamp.now(),
      bannedBy: auth.uid,
      reason: notes || 'Fraud detection',
      referralId: queueData.referralId,
    });
    
    logger.warn('🚫 User banned', {
      userId: queueData.userId.substring(0, 8),
      referralId: queueData.referralId.substring(0, 8),
    });
  }
  
  logger.info('❌ Fraud item rejected', {
    queueId,
    banUser,
    reviewedBy: auth.uid.substring(0, 8),
  });
  
  return { success: true, banned: banUser };
});

