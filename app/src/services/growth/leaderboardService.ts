import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  xp: number;
  rank: number;
}

export async function getLeaderboard(subject: string, ageBand: string): Promise<LeaderboardEntry[]> {
  const ref = doc(db, 'leaderboards', subject, ageBand, 'top');
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  const data = snap.data() as any;
  return (data.entries || []) as LeaderboardEntry[];
}
