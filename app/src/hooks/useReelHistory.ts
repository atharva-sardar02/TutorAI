/**
 * useReelHistory Hook
 * PR19+: Progress Reels UI Enhancement
 * 
 * Fetches and manages user's progress reel history
 */

import { useState, useEffect } from 'react';
import { getUserReels } from '@/services/growth/progressReelService';
import type { ProgressReelData } from '@/types/growthTypes';
import { useAuth } from './useAuth';

export function useReelHistory() {
  const { user } = useAuth();
  const [reels, setReels] = useState<ProgressReelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user?.uid) {
      setReels([]);
      setLoading(false);
      return;
    }
    
    fetchReels();
  }, [user?.uid]);
  
  async function fetchReels() {
    try {
      setLoading(true);
      setError(null);
      const userReels = await getUserReels(user?.uid);
      setReels(userReels);
    } catch (err: any) {
      console.error('Error fetching reel history:', err);
      setError(err.message || 'Failed to load reels');
    } finally {
      setLoading(false);
    }
  }
  
  return {
    reels,
    latestReel: reels[0] || null,
    hasReels: reels.length > 0,
    loading,
    error,
    refresh: fetchReels,
  };
}

