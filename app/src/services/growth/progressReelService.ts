/**
 * Progress Reel Service
 * PR19: Progress Reels
 * 
 * Client-side service for fetching and managing progress reels
 */

import { collection, doc, getDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { ProgressReelData } from '@/types/growthTypes';

/**
 * Get a single progress reel by ID
 * 
 * @param reelId - Reel ID
 * @returns Reel data or null if not found
 */
export async function getProgressReel(reelId: string): Promise<ProgressReelData | null> {
  console.log('📥 Fetching progress reel', { reelId });
  
  try {
    const reelDoc = await getDoc(doc(db, 'reels', reelId));
    
    if (!reelDoc.exists()) {
      console.warn('⚠️ Reel not found', { reelId });
      return null;
    }
    
    const data = reelDoc.data() as ProgressReelData;
    console.log('✅ Reel fetched successfully', {
      reelId,
      highlightCount: data.highlights?.length || 0,
      status: data.status,
    });
    
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch reel', { reelId, error });
    return null;
  }
}

/**
 * Get all progress reels for a user
 * 
 * @param userId - User ID (optional, defaults to current user)
 * @returns Array of reel data
 */
export async function getUserReels(userId?: string): Promise<ProgressReelData[]> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) {
    console.warn('⚠️ No user ID provided');
    return [];
  }
  
  console.log('📥 Fetching user reels', { userId: uid.substring(0, 8) });
  
  try {
    const q = query(
      collection(db, 'reels'),
      where('userId', '==', uid),
      where('status', '==', 'ready'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const snapshot = await getDocs(q);
    const reels = snapshot.docs.map(doc => doc.data() as ProgressReelData);
    
    console.log('✅ User reels fetched', {
      userId: uid.substring(0, 8),
      count: reels.length,
    });
    
    return reels;
  } catch (error) {
    console.error('❌ Failed to fetch user reels', { userId: uid, error });
    return [];
  }
}

