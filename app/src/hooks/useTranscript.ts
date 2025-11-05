/**
 * Session Intelligence: Transcript Hook (SI-06)
 * 
 * Fetches transcript for a recording from Firestore
 * Lazy-loads transcript data only when needed
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Transcript {
  recordingId: string;
  conversationId: string;
  text: string;
  summary?: string;
  wordCount: number;
  duration: number;
  language: string;
  processedAt: Timestamp;
  status: 'processing' | 'complete' | 'failed';
  error?: string;
  topics?: string[];
  qualityScore?: number;
  dailySummaryDate?: string;
}

export interface UseTranscriptResult {
  transcript: Transcript | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch transcript for a recording
 * Lazy-loads - only fetches when conversationId and recordingId are provided
 * 
 * @param conversationId - ID of the conversation
 * @param recordingId - ID of the recording
 * @returns Transcript data, loading state, error, and refetch function
 */
export function useTranscript(
  conversationId: string | null,
  recordingId: string | null
): UseTranscriptResult {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = () => {
    setFetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!conversationId || !recordingId) {
      setTranscript(null);
      setLoading(false);
      setError(null);
      return;
    }

    console.log('📝 Fetching transcript:', {
      conversationId: conversationId.substring(0, 12),
      recordingId: recordingId.substring(0, 8),
    });

    setLoading(true);
    setError(null);

    const fetchTranscript = async () => {
      try {
        // Fetch transcript document
        const transcriptRef = doc(
          db,
          'transcripts',
          conversationId,
          'recordings',
          recordingId
        );

        const transcriptSnap = await getDoc(transcriptRef);

        if (!transcriptSnap.exists()) {
          console.warn('⚠️ Transcript not found:', {
            conversationId: conversationId.substring(0, 12),
            recordingId: recordingId.substring(0, 8),
          });
          setTranscript(null);
          setLoading(false);
          return;
        }

        const transcriptData = {
          ...transcriptSnap.data(),
        } as Transcript;

        console.log('✅ Transcript fetched:', {
          conversationId: conversationId.substring(0, 12),
          recordingId: recordingId.substring(0, 8),
          wordCount: transcriptData.wordCount,
          status: transcriptData.status,
        });

        setTranscript(transcriptData);
        setLoading(false);
      } catch (err) {
        console.error('❌ Failed to fetch transcript:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [conversationId, recordingId, fetchTrigger]);

  return { transcript, loading, error, refetch };
}

