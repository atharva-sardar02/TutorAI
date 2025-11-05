import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const getDb = () => admin.firestore();

interface CohortRoomDoc {
  participants: string[];
  streaks?: Record<string, number>;
  upcomingSessions?: Array<{ startTime: admin.firestore.Timestamp; title: string }>;
  lastActiveAt: admin.firestore.Timestamp;
}

function getCohortRef(cohortId: string) {
  return getDb().collection('cohorts').doc(cohortId);
}

export const joinCohortRoom = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  const userId = auth.uid;
  const cohortId = data?.cohortId as string;
  if (!cohortId) {
    throw new HttpsError('invalid-argument', 'cohortId is required');
  }

  const ref = getCohortRef(cohortId);
  const now = admin.firestore.Timestamp.now();

  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const initial: CohortRoomDoc = {
        participants: [userId],
        streaks: {},
        upcomingSessions: [],
        lastActiveAt: now,
      };
      tx.set(ref, initial);
    } else {
      const data = snap.data() as CohortRoomDoc;
      const participants = new Set<string>(data.participants || []);
      participants.add(userId);
      tx.update(ref, { participants: Array.from(participants), lastActiveAt: now });
    }
  });

  logger.info('👥 Joined cohort room', { cohortId: cohortId.substring(0, 8), userId: userId.substring(0, 8) });
  return { success: true };
});

export const leaveCohortRoom = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  const userId = auth.uid;
  const cohortId = data?.cohortId as string;
  if (!cohortId) {
    throw new HttpsError('invalid-argument', 'cohortId is required');
  }

  const ref = getCohortRef(cohortId);
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const room = snap.data() as CohortRoomDoc;
    const updated = (room.participants || []).filter((id) => id !== userId);
    tx.update(ref, { participants: updated, lastActiveAt: admin.firestore.Timestamp.now() });
  });

  logger.info('👋 Left cohort room', { cohortId: cohortId.substring(0, 8), userId: userId.substring(0, 8) });
  return { success: true };
});

export async function updateCohortPresence(cohortId: string, userId: string): Promise<void> {
  const ref = getCohortRef(cohortId);
  const now = admin.firestore.Timestamp.now();
  await ref.set({ lastActiveAt: now }, { merge: true });
  logger.debug('⏱️ Cohort presence updated', { cohortId: cohortId.substring(0, 8), userId: userId.substring(0, 8) });
}
