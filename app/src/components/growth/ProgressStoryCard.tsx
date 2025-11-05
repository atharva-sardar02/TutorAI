/**
 * Progress Story Card
 * PR19+: Progress Reels UI Enhancement
 * 
 * Spotify Wrapped-style entry point for Progress Reels
 * Displays on Overview screen to highlight latest achievements
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useReelHistory } from '@/hooks/useReelHistory';
import { isLoopEnabled } from '@/config/featureFlags';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

export function ProgressStoryCard() {
  const { latestReel, hasReels, loading } = useReelHistory();
  const progressReelEnabled = isLoopEnabled('progressReel');
  
  // Don't show if feature disabled
  if (!progressReelEnabled) {
    return null;
  }
  
  // Loading state
  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color="#4CAF50" />
      </View>
    );
  }
  
  // No reels yet - show teaser
  if (!hasReels) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        disabled
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={40} color="white" />
          </View>
          <Text style={styles.title}>Your Progress Story</Text>
          <Text style={styles.subtitle}>
            Complete a high-quality session to unlock your first progress reel
          </Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  
  // Has reels - show latest
  const qualityColor = 
    latestReel.qualityScore >= 90 ? '#4CAF50' :
    latestReel.qualityScore >= 80 ? '#FF9800' : '#2196F3';
  
  const sentimentEmoji = 
    latestReel.sentiment === 'positive' ? '🎉' :
    latestReel.sentiment === 'neutral' ? '📚' : '💪';
  
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => {
        if (latestReel.reelId) {
          router.push({
            pathname: '/progressReel',
            params: { reelId: latestReel.reelId },
          });
        }
      }}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.emoji}>{sentimentEmoji}</Text>
            <View>
              <Text style={styles.title}>Your Progress Story</Text>
              <Text style={styles.timestamp}>
                {formatRelativeTime(latestReel.createdAt)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.push('/reelHistory')}
          >
            <Ionicons name="time-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Quality Badge */}
        <View style={[styles.qualityBadge, { backgroundColor: qualityColor }]}>
          <Ionicons name="star" size={16} color="white" />
          <Text style={styles.qualityScore}>{latestReel.qualityScore}</Text>
        </View>
        
        {/* Preview Text */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewText} numberOfLines={2}>
            {latestReel.highlights[0] || 'Tap to view your progress highlights'}
          </Text>
        </View>
        
        {/* CTA */}
        <View style={styles.ctaContainer}>
          <View style={styles.highlightCount}>
            <Ionicons name="images-outline" size={16} color="white" />
            <Text style={styles.highlightCountText}>
              {latestReel.highlights.length} highlights
            </Text>
          </View>
          <View style={styles.playButton}>
            <Ionicons name="play" size={20} color="#667eea" />
            <Text style={styles.playText}>View Story</Text>
          </View>
        </View>
        
        {/* Sparkle Effect */}
        <View style={styles.sparkle1}>
          <Ionicons name="sparkles" size={20} color="rgba(255,255,255,0.3)" />
        </View>
        <View style={styles.sparkle2}>
          <Ionicons name="sparkles" size={16} color="rgba(255,255,255,0.2)" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function formatRelativeTime(timestamp: any): string {
  if (!timestamp?.toDate) return 'Recently';
  
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: 220,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingCard: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  timestamp: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  qualityScore: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginLeft: 4,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 12,
  },
  previewText: {
    fontSize: 15,
    color: 'white',
    lineHeight: 22,
    opacity: 0.95,
  },
  ctaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  highlightCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highlightCountText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 6,
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
  },
  playText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#667eea',
    marginLeft: 6,
  },
  comingSoonBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  sparkle1: {
    position: 'absolute',
    top: 30,
    right: 30,
    opacity: 0.5,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    opacity: 0.5,
  },
});

