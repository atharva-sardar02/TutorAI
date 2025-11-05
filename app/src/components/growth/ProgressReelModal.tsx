/**
 * Progress Reel Modal
 * PR19: Progress Reels
 * 
 * Interactive carousel-based progress reel viewer
 * Uses React Native Animated for smooth 60fps animations
 * 
 * Features:
 * - Intro slide with score
 * - Highlight slides (one per achievement)
 * - CTA slide with referral link
 * - Native share functionality
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProgressReelData } from '@/types/growthTypes';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';

interface ProgressReelModalProps {
  visible: boolean;
  reel: ProgressReelData | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 48;

export function ProgressReelModal({ visible, reel, onClose }: ProgressReelModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { user } = useAuth(); // PR30: Detect if parent is viewing
  
  if (!reel) return null;
  
  // PR30: Check if viewing user is a parent
  const isParent = user?.userType === 'parent';
  
  // Build slides array: intro + highlights + CTA
  const slides = [
    {
      type: 'intro',
      content: {
        title: 'Session Highlights',
        subtitle: `Quality Score: ${reel.qualityScore}/100`,
        emoji: reel.sentiment === 'positive' ? '🎉' : reel.sentiment === 'neutral' ? '📚' : '💪',
      },
    },
    ...reel.highlights.map((highlight, i) => ({
      type: 'highlight',
      content: {
        number: i + 1,
        text: highlight,
      },
    })),
    {
      type: 'cta',
      content: {
        title: 'Want Results Like This?',
        subtitle: 'Join our tutoring community',
      },
    },
  ];
  
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this progress! ${reel.referralLink}`,
        title: 'Student Progress Highlights',
      });
    } catch (error) {
      console.error('Error sharing reel:', error);
    }
  };
  
  // PR30: Handle parent challenge creation
  const handleCreateChallenge = () => {
    if (!reel.subject || !reel.topics || reel.topics.length === 0) {
      Alert.alert(
        'Unable to Create Challenge',
        'Session information is incomplete. Please try again later.'
      );
      return;
    }
    
    // Close reel modal and navigate to challenge creation
    onClose();
    
    // Use router to navigate to challenge modal with session data
    // This will trigger the StudyBuddyChallengeModal with parent-specific UI
    router.push({
      pathname: '/(tabs)/index', // Navigate back to main screen
      params: {
        createChallenge: 'true',
        subject: reel.subject,
        topic: reel.topics[0],
        difficulty: reel.qualityScore >= 90 ? 'hard' : reel.qualityScore >= 80 ? 'medium' : 'easy',
      },
    });
  };
  
  const renderSlide = (slide: any, index: number) => {
    if (slide.type === 'intro') {
      return (
        <View key={index} style={[styles.slide, { width: SLIDE_WIDTH }]}>
          <Text style={styles.emoji}>{slide.content.emoji}</Text>
          <Text style={styles.slideTitle}>{slide.content.title}</Text>
          <Text style={styles.slideSubtitle}>{slide.content.subtitle}</Text>
        </View>
      );
    }
    
    if (slide.type === 'highlight') {
      return (
        <View key={index} style={[styles.slide, { width: SLIDE_WIDTH }]}>
          <View style={styles.highlightNumber}>
            <Text style={styles.highlightNumberText}>{slide.content.number}</Text>
          </View>
          <Text style={styles.highlightText}>{slide.content.text}</Text>
        </View>
      );
    }
    
    if (slide.type === 'cta') {
      return (
        <View key={index} style={[styles.slide, { width: SLIDE_WIDTH }]}>
          <Ionicons name="rocket" size={64} color="#4CAF50" />
          <Text style={styles.ctaTitle}>{slide.content.title}</Text>
          <Text style={styles.ctaSubtitle}>{slide.content.subtitle}</Text>
          
          {/* PR30: Parent Challenge CTA */}
          {isParent && reel.qualityScore >= 70 && (
            <TouchableOpacity 
              style={styles.challengeButton}
              onPress={handleCreateChallenge}
            >
              <Ionicons name="trophy" size={24} color="white" />
              <Text style={styles.challengeButtonText}>
                Take the Beat My Skill Challenge!
              </Text>
              <Text style={styles.challengeButtonSubtext}>
                Challenge your child and earn XP together
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    return null;
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Progress Reel</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={28} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            {
              useNativeDriver: false,
              listener: (event: any) => {
                const slideIndex = Math.round(
                  event.nativeEvent.contentOffset.x / SLIDE_WIDTH
                );
                setCurrentSlide(slideIndex);
              },
            }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
        >
          {slides.map((slide, index) => renderSlide(slide, index))}
        </ScrollView>
        
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentSlide === index && styles.dotActive,
              ]}
            />
          ))}
        </View>
        
        <TouchableOpacity style={styles.shareBottomButton} onPress={handleShare}>
          <Ionicons name="share-social" size={20} color="white" />
          <Text style={styles.shareBottomButtonText}>Share Progress Reel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  shareButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  slide: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    marginRight: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  slideSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  highlightNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  highlightNumberText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  highlightText: {
    fontSize: 20,
    color: '#333',
    textAlign: 'center',
    lineHeight: 32,
  },
  ctaTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCC',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  shareBottomButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    marginHorizontal: 24,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  shareBottomButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  // PR30: Parent Challenge Button Styles
  challengeButton: {
    backgroundColor: '#667eea',
    marginTop: 32,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    minWidth: 280,
  },
  challengeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  challengeButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
});

