import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/index';

export interface UserPercentileStats {
  monthlyXp: number;
  monthlyChallenges: number;
  monthlyPercentile: number; // 0-100, or -1 if insufficient data
  monthStart: Date;
  lastUpdated: Date;
}

export function useUserPercentile(userId: string | undefined) {
  const [stats, setStats] = useState<UserPercentileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data() as User;
          
          if (userData.stats) {
            setStats({
              monthlyXp: userData.stats.monthlyXp,
              monthlyChallenges: userData.stats.monthlyChallenges,
              monthlyPercentile: userData.stats.monthlyPercentile,
              monthStart: userData.stats.monthStart.toDate(),
              lastUpdated: userData.stats.lastUpdated.toDate(),
            });
          } else {
            // No stats yet - return zero stats
            setStats({
              monthlyXp: 0,
              monthlyChallenges: 0,
              monthlyPercentile: -1,
              monthStart: new Date(),
              lastUpdated: new Date(),
            });
          }
        } else {
          setError('User not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching user percentile:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { stats, loading, error };
}

