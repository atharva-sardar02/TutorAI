/**
 * Session Intelligence: Weekly Summaries Hook (SI-09)
 * 
 * Fetches weekly progress reels for a user's conversations
 * Used in Overview screen to display latest weekly highlights
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface WeeklyReelData {
  reelId: string;
  userId: string;
  conversationId: string;
  weekId: string; // "2025-W01"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  highlights: string[];
  aggregatedSummary: string;
  qualityScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  totalRecordings: number;
  totalDuration: number; // seconds
  imageUrls: string[];
  referralLink: string;
  createdAt: any; // Firestore Timestamp
  expiresAt: any; // Firestore Timestamp
  status: 'ready' | 'generating' | 'failed';
  viewedAt?: any; // Firestore Timestamp - for mark-as-seen
}

/**
 * Hook to fetch weekly reels for a specific user
 * Returns most recent reels across all their conversations
 * 
 * @param userId - User ID
 * @param limitCount - Max number of reels to return (default: 10)
 */
export function useWeeklySummaries(userId: string | undefined, limitCount: number = 10) {
  const [reels, setReels] = useState<WeeklyReelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setReels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const reelsRef = collection(db, 'reels');
    const q = query(
      reelsRef,
      where('userId', '==', userId),
      where('status', '==', 'ready'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    console.log(`🎬 Setting up weekly reels listener for user: ${userId.substring(0, 8)}`);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedReels: WeeklyReelData[] = snapshot.docs
          .map((doc) => ({
            reelId: doc.id,
            ...doc.data(),
          }))
          .filter((reel: any) => reel.weekId !== undefined) as WeeklyReelData[]; // Only weekly reels (have weekId)

        setReels(fetchedReels);
        setLoading(false);
        console.log(`✅ Weekly reels updated: ${fetchedReels.length} reels found`);
      },
      (err) => {
        console.error('❌ Weekly reels listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      console.log('🔌 Unsubscribing from weekly reels listener');
      unsubscribe();
    };
  }, [userId, limitCount]);

  return { reels, loading, error };
}

/**
 * Hook to fetch the latest weekly reel for a specific conversation
 * Used to show conversation-specific progress
 * 
 * @param conversationId - Conversation ID
 */
export function useLatestWeeklyReel(conversationId: string | undefined) {
  const [reel, setReel] = useState<WeeklyReelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setReel(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const reelsRef = collection(db, 'reels');
    const q = query(
      reelsRef,
      where('conversationId', '==', conversationId),
      where('status', '==', 'ready'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    console.log(`🎬 Fetching latest weekly reel for conversation: ${conversationId.substring(0, 12)}`);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setReel(null);
          setLoading(false);
          console.log('ℹ️ No weekly reel found for conversation');
          return;
        }

        const doc = snapshot.docs[0];
        const fetchedReel = {
          reelId: doc.id,
          ...doc.data(),
        } as WeeklyReelData;

        // Only return if it's a weekly reel (has weekId)
        if (fetchedReel.weekId) {
          setReel(fetchedReel);
          console.log(`✅ Latest weekly reel fetched: ${fetchedReel.weekId}`);
        } else {
          setReel(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('❌ Latest weekly reel listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      console.log('🔌 Unsubscribing from latest weekly reel listener');
      unsubscribe();
    };
  }, [conversationId]);

  return { reel, loading, error };
}

/**
 * Mark a weekly reel as viewed
 * Updates the viewedAt timestamp for "mark-as-seen" badge logic
 * 
 * @param reelId - Reel ID to mark as viewed
 */
export async function markWeeklyReelAsViewed(reelId: string): Promise<void> {
  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const reelRef = doc(db, 'reels', reelId);
    
    await updateDoc(reelRef, {
      viewedAt: serverTimestamp(),
    });
    
    console.log(`✅ Marked weekly reel as viewed: ${reelId}`);
  } catch (error: any) {
    console.error('❌ Failed to mark weekly reel as viewed:', error);
    throw error;
  }
}

