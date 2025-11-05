/**
 * Hook to subscribe to subject presence aggregates
 * PR21: Activity Feed
 */

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SubjectPresence {
  subject: string;
  activeCount: number;
  activeTutorIds: string[];
  updatedAt: Timestamp;
}

/**
 * Subscribe to active subject presence
 * Returns list sorted by activeCount (descending)
 */
export function useSubjectPresence() {
  const [subjects, setSubjects] = useState<SubjectPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const presenceRef = collection(db, 'presence', 'subjects', 'active');
    const q = query(presenceRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => doc.data() as SubjectPresence)
          .filter((s) => s.activeCount > 0) // Only show subjects with active sessions
          .sort((a, b) => b.activeCount - a.activeCount); // Sort by count descending

        setSubjects(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to subject presence:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { subjects, loading, error };
}

