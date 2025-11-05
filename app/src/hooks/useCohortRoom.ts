import { useEffect, useState } from 'react';
import { subscribeCohortRoom } from '@/services/growth/cohortService';

export function useCohortRoom(cohortId: string) {
  const [room, setRoom] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cohortId) return;
    const unsub = subscribeCohortRoom(cohortId, (data) => {
      setRoom(data);
      setLoading(false);
    });
    return () => unsub();
  }, [cohortId]);

  return { room, loading };
}
