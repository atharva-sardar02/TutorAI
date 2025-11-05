/**
 * Session Intelligence: Weekly Reel Card (SI-09)
 * 
 * Displays weekly progress reel preview in Overview screen
 * Shows highlights, quality score, and mark-as-seen badge
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, parseISO } from 'date-fns';
import type { WeeklyReelData } from '@/hooks/useWeeklySummaries';

interface WeeklyReelCardProps {
  reel: WeeklyReelData;
  onPress: (reel: WeeklyReelData) => void;
}

export function WeeklyReelCard({ reel, onPress }: WeeklyReelCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Determine gradient colors based on sentiment
  const gradientColors: [string, string, ...string[]] =
    reel.sentiment === 'positive'
      ? ['#667eea', '#764ba2']
      : reel.sentiment === 'neutral'
      ? ['#4facfe', '#00f2fe']
      : ['#fa709a', '#fee140'];

  // Check if reel is new (not viewed yet)
  const isNew = !reel.viewedAt;

  // Format date range
  const startDate = format(parseISO(reel.startDate), 'MMM d');
  const endDate = format(parseISO(reel.endDate), 'MMM d, yyyy');
  const dateRange = `${startDate} - ${endDate}`;

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <TouchableOpacity
      style={[styles.card, isDark && styles.cardDark]}
      onPress={() => onPress(reel)}
      activeOpacity={0.8}
    >
      <LinearGradient colors={gradientColors} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* New Badge */}
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="videocam" size={24} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Weekly Progress Reel</Text>
            <Text style={styles.subtitle}>{dateRange}</Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{reel.qualityScore}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Ionicons name="film-outline" size={16} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.statText}>{reel.totalRecordings} recordings</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={16} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.statText}>{formatDuration(reel.totalDuration)}</Text>
          </View>
          {reel.topics && reel.topics.length > 0 && (
            <View style={styles.stat}>
              <Ionicons name="school-outline" size={16} color="rgba(255, 255, 255, 0.9)" />
              <Text style={styles.statText}>{reel.topics.length} topics</Text>
            </View>
          )}
        </View>

        {/* Highlights Preview */}
        {reel.highlights && reel.highlights.length > 0 && (
          <View style={styles.highlightsContainer}>
            <Text style={styles.highlightsTitle}>Highlights:</Text>
            {reel.highlights.slice(0, 2).map((highlight, index) => (
              <View key={index} style={styles.highlightItem}>
                <Text style={styles.highlightBullet}>•</Text>
                <Text style={styles.highlightText} numberOfLines={2}>
                  {highlight}
                </Text>
              </View>
            ))}
            {reel.highlights.length > 2 && (
              <Text style={styles.moreHighlights}>
                +{reel.highlights.length - 2} more highlights
              </Text>
            )}
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaText}>Tap to view full reel</Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.9)" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardDark: {
    shadowColor: '#fff',
    shadowOpacity: 0.1,
  },
  gradient: {
    padding: 20,
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  highlightsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  highlightsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  highlightItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  highlightBullet: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
    marginTop: -2,
  },
  highlightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  moreHighlights: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

