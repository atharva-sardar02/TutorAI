import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const getDb = () => admin.firestore();

type AgeBand = '13-15' | '16-18' | 'unknown';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  xp: number;
  rank: number;
}

function getAgeBandFromDob(dob?: admin.firestore.Timestamp): AgeBand {
  if (!dob) return 'unknown';
  try {
    const birth = dob.toDate();
    const now = new Date();
    const years = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (years >= 13 && years <= 15) return '13-15';
    if (years >= 16 && years <= 18) return '16-18';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function fetchUsersWithPrivacy(): Promise<Array<{ userId: string; displayName: string; ageBand: AgeBand; optedOut: boolean }>> {
  const snapshot = await getDb().collection('users').get();
  return snapshot.docs.map((d) => {
    const data = d.data() as any;
    const ageBand = getAgeBandFromDob(data.dateOfBirth);
    const optedOut = !!data.privacy?.leaderboardOptOut;
    const displayName = data.displayName || data.name || 'User';
    return { userId: d.id, displayName, ageBand, optedOut };
  });
}

async function fetchBalances(): Promise<Map<string, number>> {
  const snapshot = await getDb().collection('balances').get();
  const m = new Map<string, number>();
  snapshot.docs.forEach((d) => {
    const data = d.data() as any;
    m.set(d.id, Number(data.xpBalance || 0));
  });
  return m;
}

async function writeLeaderboard(subject: string, ageBand: AgeBand, entries: LeaderboardEntry[]): Promise<void> {
  const ref = getDb().collection('leaderboards').doc(subject).collection(ageBand).doc('top');
  await ref.set({ entries, computedAt: admin.firestore.Timestamp.now() });
}

export const computeLeaderboards = onSchedule('every 24 hours', async () => {
  logger.info('🏁 Computing leaderboards');
  try {
    const users = await fetchUsersWithPrivacy();
    const balances = await fetchBalances();

    // Subjects supported (fallback: single "All" subject using overall XP)
    const subjects = ['All'];

    for (const subject of subjects) {
      const byAge: Record<AgeBand, LeaderboardEntry[]> = { '13-15': [], '16-18': [], 'unknown': [] };

      users.forEach((u) => {
        if (u.optedOut) return; // respect privacy
        const baseXp = balances.get(u.userId) || 0;
        // New-user boost placeholder: apply small multiplier if no more than 30 days since account creation (not available → skip)
        const boostedXp = baseXp;
        const entry: LeaderboardEntry = {
          userId: u.userId,
          displayName: u.displayName,
          xp: boostedXp,
          rank: 0,
        };
        byAge[u.ageBand].push(entry);
      });

      for (const band of Object.keys(byAge) as AgeBand[]) {
        const sorted = byAge[band].sort((a, b) => b.xp - a.xp).map((e, idx) => ({ ...e, rank: idx + 1 })).slice(0, 100);
        await writeLeaderboard(subject, band, sorted);
        logger.info('✅ Leaderboard written', { subject, ageBand: band, count: sorted.length });
      }
    }
  } catch (error: any) {
    logger.error('❌ Failed to compute leaderboards', { error: error.message });
    throw error;
  }
});
