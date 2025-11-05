import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

const functions = getFunctions();

export async function joinCohort(cohortId: string): Promise<void> {
  const fn = httpsCallable(functions, 'joinCohortRoom');
  await fn({ cohortId });
}

export async function leaveCohort(cohortId: string): Promise<void> {
  const fn = httpsCallable(functions, 'leaveCohortRoom');
  await fn({ cohortId });
}

export function subscribeCohortRoom(
  cohortId: string,
  onChange: (data: any | null) => void
): () => void {
  const ref = doc(db, 'cohorts', cohortId);
  return onSnapshot(ref, (snap) => onChange(snap.exists() ? snap.data() : null));
}
