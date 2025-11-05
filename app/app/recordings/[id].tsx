/**
 * Session Intelligence: Recordings Screen (SI-06)
 * 
 * Displays all recordings for a conversation
 * Allows viewing individual recordings and their transcripts
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRecordings } from '@/hooks/useRecordings';
import { useTranscript } from '@/hooks/useTranscript';
import RecordingCard from '@/components/recordings/RecordingCard';
import TranscriptSheet from '@/components/recordings/TranscriptSheet';

export default function RecordingsScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const { recordings, loading, error } = useRecordings(conversationId);
  
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [transcriptModalVisible, setTranscriptModalVisible] = useState(false);
  
  const {
    transcript,
    loading: transcriptLoading,
    error: transcriptError,
  } = useTranscript(
    transcriptModalVisible ? conversationId : null,
    selectedRecordingId
  );

  const handleRecordingPress = (recordingId: string) => {
    setSelectedRecordingId(recordingId);
    setTranscriptModalVisible(true);
  };

  const handleCloseTranscript = () => {
    setTranscriptModalVisible(false);
    setSelectedRecordingId(null);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading recordings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ Failed to load recordings</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (recordings.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🎥</Text>
        <Text style={styles.emptyText}>No recordings yet</Text>
        <Text style={styles.emptySubtext}>
          Upload video or audio lectures to see them here
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Chat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Text style={styles.backIconText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recordings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Recordings list */}
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecordingCard
            recording={item}
            onPress={() => handleRecordingPress(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              {recordings.length} {recordings.length === 1 ? 'recording' : 'recordings'}
            </Text>
          </View>
        }
      />

      {/* Transcript modal */}
      <Modal
        visible={transcriptModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseTranscript}
      >
        <TranscriptSheet
          transcript={transcript}
          loading={transcriptLoading}
          error={transcriptError}
          onClose={handleCloseTranscript}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backIcon: {
    padding: 4,
  },
  backIconText: {
    fontSize: 32,
    color: '#007AFF',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingVertical: 16,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
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
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

