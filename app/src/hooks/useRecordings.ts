/**
 * Session Intelligence: Recordings Hook (SI-06)
 * 
 * Fetches recordings for a conversation from Firestore
 * Returns real-time list of video/audio recordings with metadata
 */

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Recording {
  id: string;
  conversationId: string;
  fileType: 'video' | 'audio';
  storageUrl: string;
  duration?: number; // in seconds
  uploadedAt: Timestamp;
  processedUrl?: string; // Watermarked version (future)
  transcriptId?: string;
  transcriptWordCount?: number;
}

export interface UseRecordingsResult {
  recordings: Recording[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch and listen to recordings for a conversation
 * 
 * @param conversationId - ID of the conversation
 * @returns Recordings list, loading state, and error
 */
export function useRecordings(conversationId: string): UseRecordingsResult {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setRecordings([]);
      setLoading(false);
      return;
    }

    console.log('🎬 Setting up recordings listener:', conversationId.substring(0, 12));

    try {
      // Query recordings subcollection
      const recordingsRef = collection(
        db,
        'recordings',
        conversationId,
        'recordings'
      );

      const q = query(
        recordingsRef,
        orderBy('uploadedAt', 'desc') // Most recent first
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const recordingsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Recording[];

          console.log('✅ Recordings updated:', {
            conversationId: conversationId.substring(0, 12),
            count: recordingsList.length,
          });

          setRecordings(recordingsList);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('❌ Recordings listener error:', err);
          setError(err as Error);
          setLoading(false);
        }
      );

      return () => {
        console.log('🔌 Unsubscribing from recordings listener');
        unsubscribe();
      };
    } catch (err) {
      console.error('❌ Failed to set up recordings listener:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [conversationId]);

  return { recordings, loading, error };
}

