/**
 * Session Intelligence: Recording Card (SI-06)
 * 
 * Displays a recording with thumbnail, duration, date, and transcript status
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Recording } from '@/hooks/useRecordings';

interface RecordingCardProps {
  recording: Recording;
  onPress: () => void;
}

export default function RecordingCard({ recording, onPress }: RecordingCardProps) {
  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Unknown date';
    
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const hasTranscript = !!recording.transcriptId;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Thumbnail placeholder */}
      <View style={styles.thumbnail}>
        <Text style={styles.thumbnailIcon}>
          {recording.fileType === 'video' ? '🎥' : '🎤'}
        </Text>
      </View>

      {/* Recording info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {recording.fileType === 'video' ? 'Video Lecture' : 'Audio Lecture'}
        </Text>
        
        <View style={styles.metadata}>
          <Text style={styles.metadataText}>{formatDate(recording.uploadedAt)}</Text>
          {recording.duration && (
            <>
              <Text style={styles.metadataDot}>•</Text>
              <Text style={styles.metadataText}>{formatDuration(recording.duration)}</Text>
            </>
          )}
        </View>

        {/* Transcript status */}
        {hasTranscript && (
          <View style={styles.transcriptBadge}>
            <Text style={styles.transcriptBadgeText}>
              ✓ Transcript ({recording.transcriptWordCount || 0} words)
            </Text>
          </View>
        )}
      </View>

      {/* Arrow indicator */}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thumbnailIcon: {
    fontSize: 36,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metadataText: {
    fontSize: 13,
    color: '#666',
  },
  metadataDot: {
    fontSize: 13,
    color: '#666',
    marginHorizontal: 6,
  },
  transcriptBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  transcriptBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2e7d32',
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
});

