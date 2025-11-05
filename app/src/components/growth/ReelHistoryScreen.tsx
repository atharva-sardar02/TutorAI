/**
 * Reel History Screen
 * PR19+: Progress Reels UI Enhancement
 * 
 * Browse all past progress reels in a beautiful gallery
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useReelHistory } from '@/hooks/useReelHistory';
import type { ProgressReelData } from '@/types/growthTypes';

export default function ReelHistoryScreen() {
  const { reels, loading, error, refresh } = useReelHistory();
  const [refreshing, setRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  
  const renderReelCard = ({ item }: { item: ProgressReelData }) => {
    const qualityColor = 
      item.qualityScore >= 90 ? '#4CAF50' :
      item.qualityScore >= 80 ? '#FF9800' : '#2196F3';
    
    const sentimentEmoji = 
      item.sentiment === 'positive' ? '🎉' :
      item.sentiment === 'neutral' ? '📚' : '💪';
    
    const gradientColors = 
      item.qualityScore >= 90 ? ['#667eea', '#764ba2'] :
      item.qualityScore >= 80 ? ['#f093fb', '#f5576c'] :
      ['#4facfe', '#00f2fe'];
    
    return (
      <TouchableOpacity
        style={styles.reelCard}
        activeOpacity={0.9}
        onPress={() => {
          if (item.reelId) {
            router.push({
              pathname: '/progressReel',
              params: { reelId: item.reelId },
            });
          }
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>{sentimentEmoji}</Text>
            <View style={[styles.qualityBadge, { backgroundColor: qualityColor }]}>
              <Ionicons name="star" size={12} color="white" />
              <Text style={styles.qualityText}>{item.qualityScore}</Text>
            </View>
          </View>
          
          {/* Date */}
          <Text style={styles.cardDate}>
            {formatDate(item.createdAt)}
          </Text>
          
          {/* Preview */}
          <Text style={styles.cardPreview} numberOfLines={3}>
            {item.highlights[0] || 'Tap to view highlights'}
          </Text>
          
          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.highlightCount}>
              <Ionicons name="images-outline" size={14} color="white" />
              <Text style={styles.highlightCountText}>
                {item.highlights.length}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };
  
  if (loading && reels.length === 0) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Your Progress Story' }} />
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading your stories...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Your Progress Story' }} />
        <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (reels.length === 0) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Your Progress Story' }} />
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="sparkles" size={64} color="#667eea" />
          </View>
          <Text style={styles.emptyTitle}>No Stories Yet</Text>
          <Text style={styles.emptySubtitle}>
            Complete high-quality tutoring sessions to unlock your progress reels
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.back()}
          >
            <Text style={styles.emptyButtonText}>Back to Overview</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Your Progress Story',
          headerStyle: { backgroundColor: '#667eea' },
          headerTintColor: 'white',
        }} 
      />
      
      {/* Hero Section */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>
          {reels.length} {reels.length === 1 ? 'Story' : 'Stories'}
        </Text>
        <Text style={styles.heroSubtitle}>
          Your journey of growth and achievement
        </Text>
      </LinearGradient>
      
      {/* Reel Grid */}
      <FlatList
        data={reels}
        renderItem={renderReelCard}
        keyExtractor={(item) => item.reelId}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#667eea"
          />
        }
        ListFooterComponent={
          <Text style={styles.footerText}>
            Reels auto-delete after 30 days
          </Text>
        }
      />
    </View>
  );
}

function formatDate(timestamp: any): string {
  if (!timestamp?.toDate) return 'Unknown date';
  
  const date = timestamp.toDate();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  hero: {
    padding: 24,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  grid: {
    padding: 16,
    paddingBottom: 32,
  },
  row: {
    justifyContent: 'space-between',
  },
  reelCard: {
    width: '48%',
    aspectRatio: 0.7,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 32,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    marginLeft: 4,
  },
  cardDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 8,
  },
  cardPreview: {
    fontSize: 13,
    color: 'white',
    lineHeight: 18,
    flex: 1,
    marginTop: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  highlightCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highlightCountText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
    marginTop: 16,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

