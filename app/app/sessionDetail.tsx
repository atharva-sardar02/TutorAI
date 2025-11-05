/**
 * Session Detail Screen
 * PR20: Transcription & Agentic Actions
 * 
 * Displays AI-generated session summary, highlights, and prep pack materials
 */

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, collection, query, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';

interface SessionSummary {
  sessionId: string;
  highlights: string[];
  topics: string[];
  studentProgress: {
    strengths: string[];
    improvements: string[];
    nextSteps: string[];
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  qualityScore: number;
  viralSignals: {
    hasBigWin: boolean;
    hasProgress: boolean;
    hasTestTopic: boolean;
    hasPositiveFeedback: boolean;
  };
}

interface PrepPack {
  sessionId: string;
  title: string;
  topics: string[];
  materials: {
    type: 'practice_problems' | 'study_guide' | 'flashcards' | 'video_links';
    title: string;
    content: string;
  }[];
  nextSteps: string[];
  estimatedTime: number;
}

export default function SessionDetailScreen() {
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;
  
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [prepPack, setPrepPack] = useState<PrepPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);
  
  async function loadSessionData() {
    try {
      setLoading(true);
      setError(null);
      
      // Load summary
      const summaryDoc = await getDoc(
        doc(db, 'sessions', sessionId, 'summary', 'latest')
      );
      
      if (summaryDoc.exists()) {
        setSummary(summaryDoc.data() as SessionSummary);
      } else {
        setError('Session summary not available yet. It may still be processing.');
      }
      
      // Load prep pack
      const prepPackDoc = await getDoc(
        doc(db, 'sessions', sessionId, 'prepPacks', 'latest')
      );
      
      if (prepPackDoc.exists()) {
        setPrepPack(prepPackDoc.data() as PrepPack);
      }
      
    } catch (err: any) {
      console.error('Error loading session data:', err);
      setError(err.message || 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  }
  
  async function handleShare() {
    if (!summary) return;
    
    try {
      const shareText = `
📚 Session Highlights

${summary.highlights.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Topics Covered: ${summary.topics.join(', ')}

Quality Score: ${summary.qualityScore}/100
`.trim();
      
      await Share.share({
        message: shareText,
        title: 'Session Highlights',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }
  
  function handleViewMaterial(material: PrepPack['materials'][0]) {
    Alert.alert(
      material.title,
      material.content,
      [{ text: 'Close' }],
      { cancelable: true }
    );
  }
  
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading session highlights...</Text>
      </View>
    );
  }
  
  if (error || !summary) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#999" />
        <Text style={styles.errorText}>{error || 'No summary available'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadSessionData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backIconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Summary</Text>
        <TouchableOpacity 
          style={styles.shareIconButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      {/* Quality Score Badge */}
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreLabel}>Quality Score</Text>
        <Text style={styles.scoreValue}>{summary.qualityScore}</Text>
        <Text style={styles.scoreOutOf}>/100</Text>
      </View>
      
      {/* Sentiment Badge */}
      {summary.sentiment && (
        <View style={[
          styles.sentimentBadge,
          summary.sentiment === 'positive' && styles.sentimentPositive,
          summary.sentiment === 'neutral' && styles.sentimentNeutral,
          summary.sentiment === 'negative' && styles.sentimentNegative,
        ]}>
          <Text style={styles.sentimentText}>
            {summary.sentiment === 'positive' ? '😊 Positive' : 
             summary.sentiment === 'neutral' ? '😐 Neutral' : 
             '😟 Needs Attention'}
          </Text>
        </View>
      )}
      
      {/* Highlights */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles" size={24} color="#FFD700" />
          <Text style={styles.sectionTitle}>Session Highlights</Text>
        </View>
        {summary.highlights.map((highlight, i) => (
          <View key={i} style={styles.highlightCard}>
            <View style={styles.highlightNumber}>
              <Text style={styles.highlightNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.highlightText}>{highlight}</Text>
          </View>
        ))}
      </View>
      
      {/* Topics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="book" size={24} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Topics Covered</Text>
        </View>
        <View style={styles.topicsList}>
          {summary.topics.map((topic, i) => (
            <View key={i} style={styles.topicChip}>
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Student Progress */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={24} color="#2196F3" />
          <Text style={styles.sectionTitle}>Student Progress</Text>
        </View>
        
        {summary.studentProgress.strengths.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>✅ Strengths</Text>
            {summary.studentProgress.strengths.map((s, i) => (
              <View key={i} style={styles.progressItem}>
                <Text style={styles.progressBullet}>•</Text>
                <Text style={styles.progressText}>{s}</Text>
              </View>
            ))}
          </>
        )}
        
        {summary.studentProgress.improvements.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>📈 Improvements</Text>
            {summary.studentProgress.improvements.map((s, i) => (
              <View key={i} style={styles.progressItem}>
                <Text style={styles.progressBullet}>•</Text>
                <Text style={styles.progressText}>{s}</Text>
              </View>
            ))}
          </>
        )}
        
        {summary.studentProgress.nextSteps.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>🎯 Next Steps</Text>
            {summary.studentProgress.nextSteps.map((s, i) => (
              <View key={i} style={styles.progressItem}>
                <Text style={styles.progressBullet}>•</Text>
                <Text style={styles.progressText}>{s}</Text>
              </View>
            ))}
          </>
        )}
      </View>
      
      {/* Prep Pack */}
      {prepPack && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="gift" size={24} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Prep Pack</Text>
          </View>
          
          <Text style={styles.prepPackTitle}>{prepPack.title}</Text>
          <View style={styles.estimatedTimeContainer}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.estimatedTime}>
              Estimated time: {prepPack.estimatedTime} min
            </Text>
          </View>
          
          {prepPack.materials.map((material, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.materialCard}
              onPress={() => handleViewMaterial(material)}
            >
              <Ionicons 
                name={getMaterialIcon(material.type)} 
                size={28} 
                color="#007AFF" 
              />
              <View style={styles.materialContent}>
                <Text style={styles.materialTitle}>{material.title}</Text>
                <Text style={styles.materialPreview} numberOfLines={2}>
                  {material.content.slice(0, 100)}...
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Share Button */}
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Ionicons name="share-social" size={20} color="white" />
        <Text style={styles.shareButtonText}>Share Highlights</Text>
      </TouchableOpacity>
      
      {/* Bottom Padding */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function getMaterialIcon(type: string): any {
  switch (type) {
    case 'practice_problems': return 'calculator';
    case 'study_guide': return 'book';
    case 'flashcards': return 'layers';
    case 'video_links': return 'play-circle';
    default: return 'document-text';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backIconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  shareIconButton: {
    padding: 8,
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreBadge: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scoreOutOf: {
    fontSize: 16,
    color: '#999',
  },
  sentimentBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  sentimentPositive: {
    backgroundColor: '#E8F5E9',
  },
  sentimentNeutral: {
    backgroundColor: '#FFF9C4',
  },
  sentimentNegative: {
    backgroundColor: '#FFEBEE',
  },
  sentimentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  highlightCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  highlightNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  highlightNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  highlightText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicChip: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  topicText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    color: '#555',
  },
  progressItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  progressBullet: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
    fontWeight: 'bold',
  },
  progressText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  prepPackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  estimatedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  estimatedTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  materialContent: {
    flex: 1,
    marginLeft: 14,
  },
  materialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  materialPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

