/**
 * Progress Reel Screen
 * PR19: Progress Reels
 * 
 * Full-screen progress reel viewer
 * Accessed via:
 * - Push notification tap
 * - Direct navigation from session detail
 * - Share link click
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ProgressReelModal } from '@/components/growth/ProgressReelModal';
import { getProgressReel } from '@/services/growth/progressReelService';
import type { ProgressReelData } from '@/types/growthTypes';

export default function ProgressReelScreen() {
  const { reelId } = useLocalSearchParams();
  const [reel, setReel] = useState<ProgressReelData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (reelId) {
      loadReel();
    }
  }, [reelId]);
  
  async function loadReel() {
    try {
      const reelData = await getProgressReel(reelId as string);
      setReel(reelData);
    } catch (error) {
      console.error('Error loading reel:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }
  
  return (
    <ProgressReelModal
      visible={true}
      reel={reel}
      onClose={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
});

