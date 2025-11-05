import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const getDb = () => admin.firestore();

export const setLeaderboardOptOut = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  const enabled = Boolean(data?.enabled);
  const userId = auth.uid;

  await getDb().collection('users').doc(userId).set({
    privacy: { leaderboardOptOut: enabled },
  }, { merge: true });

  logger.info('🛡️ Leaderboard opt-out updated', { userId: userId.substring(0, 8), enabled });
  return { success: true };
});
