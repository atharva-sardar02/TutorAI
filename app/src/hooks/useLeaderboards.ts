import { useEffect, useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '@/services/growth/leaderboardService';

export function useLeaderboards(subject: string, ageBand: string) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const data = await getLeaderboard(subject, ageBand);
      if (mounted) {
        setEntries(data);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [subject, ageBand]);

  return { entries, loading };
}
