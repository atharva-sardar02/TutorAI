/**
 * Session Intelligence: Transcript Sheet (SI-06)
 * 
 * Bottom sheet modal to view recording transcript
 * Shows full transcript text with metadata
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Transcript } from '@/hooks/useTranscript';

interface TranscriptSheetProps {
  transcript: Transcript | null;
  loading: boolean;
  error: Error | null;
  onClose: () => void;
}

export default function TranscriptSheet({
  transcript,
  loading,
  error,
  onClose,
}: TranscriptSheetProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transcript</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading transcript...</Text>
          </View>
        )}

        {error && (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>❌ Failed to load transcript</Text>
            <Text style={styles.errorDetail}>{error.message}</Text>
          </View>
        )}

        {!loading && !error && !transcript && (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>No transcript available</Text>
            <Text style={styles.emptySubtext}>
              The transcript may still be processing.
            </Text>
          </View>
        )}

        {transcript && transcript.status === 'processing' && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Transcription in progress...</Text>
          </View>
        )}

        {transcript && transcript.status === 'failed' && (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>❌ Transcription failed</Text>
            <Text style={styles.errorDetail}>{transcript.error || 'Unknown error'}</Text>
          </View>
        )}

        {transcript && transcript.status === 'complete' && (
          <>
            {/* Metadata */}
            <View style={styles.metadata}>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Duration:</Text>
                <Text style={styles.metadataValue}>
                  {formatDuration(transcript.duration)}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Word count:</Text>
                <Text style={styles.metadataValue}>{transcript.wordCount}</Text>
              </View>
              {transcript.qualityScore && (
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Quality:</Text>
                  <Text style={styles.metadataValue}>{transcript.qualityScore}/100</Text>
                </View>
              )}
            </View>

            {/* Topics */}
            {transcript.topics && transcript.topics.length > 0 && (
              <View style={styles.topicsContainer}>
                <Text style={styles.topicsLabel}>Topics:</Text>
                <View style={styles.topicsChips}>
                  {transcript.topics.map((topic, index) => (
                    <View key={index} style={styles.topicChip}>
                      <Text style={styles.topicChipText}>{topic}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Summary */}
            {transcript.summary && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryLabel}>Summary:</Text>
                <Text style={styles.summaryText}>{transcript.summary}</Text>
              </View>
            )}

            {/* Full transcript */}
            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptLabel}>Full Transcript:</Text>
              <Text style={styles.transcriptText}>{transcript.text}</Text>
            </View>

            {/* Daily summary link */}
            {transcript.dailySummaryDate && (
              <View style={styles.summaryLinkContainer}>
                <Text style={styles.summaryLinkText}>
                  📅 Part of daily summary: {transcript.dailySummaryDate}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  metadata: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  topicsContainer: {
    marginBottom: 16,
  },
  topicsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  topicsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topicChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1976d2',
  },
  summaryContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5d4037',
  },
  transcriptContainer: {
    marginBottom: 16,
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  summaryLinkContainer: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 8,
  },
  summaryLinkText: {
    fontSize: 13,
    color: '#666',
  },
});

