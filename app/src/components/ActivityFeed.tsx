/**
 * Activity Feed Component
 * PR21: Real-time "Alive" layer showing active sessions by subject
 * 
 * Displays horizontal scroll of subject cards: "🔥 12 Math sessions active now"
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSubjectPresence } from '@/hooks/useSubjectPresence';
import { ActivityDetailModal } from './ActivityDetailModal';

const SUBJECT_EMOJIS: Record<string, string> = {
  'Math': '🔢',
  'Physics': '⚛️',
  'Chemistry': '🧪',
  'Biology': '🧬',
  'English': '📚',
  'History': '📜',
  'Science': '🔬',
  'Computer Science': '💻',
  'Spanish': '🇪🇸',
  'French': '🇫🇷',
  'General': '📖',
};

export default function ActivityFeed() {
  const { subjects, loading, error } = useSubjectPresence();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Live Activity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.card, styles.skeleton]} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (error) {
    console.warn('Activity feed error:', error);
    return null; // Silent fail - don't block UI
  }

  if (subjects.length === 0) {
    // Fallback: No active sessions
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Live Activity</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active sessions right now</Text>
          <Text style={styles.emptySubtext}>Check back soon!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 Live Activity</Text>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {subjects.map((subject) => (
          <TouchableOpacity
            key={subject.subject}
            style={styles.card}
            onPress={() => setSelectedSubject(subject.subject)}
          >
            <Text style={styles.emoji}>
              {SUBJECT_EMOJIS[subject.subject] || '📖'}
            </Text>
            <Text style={styles.count}>{subject.activeCount}</Text>
            <Text style={styles.label}>
              {subject.subject} {subject.activeCount === 1 ? 'session' : 'sessions'}
            </Text>
            <Text style={styles.sublabel}>active now</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Detail Modal */}
      {selectedSubject && (
        <ActivityDetailModal
          subject={selectedSubject}
          onClose={() => setSelectedSubject(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  scroll: {
    paddingLeft: 16,
  },
  scrollContent: {
    paddingRight: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skeleton: {
    backgroundColor: '#f0f0f0',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  count: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  sublabel: {
    fontSize: 11,
    color: '#666',
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
  },
});

