/**
 * Study Buddy Challenge Modal
 * PR23: Creator view for sharing challenges
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Challenge } from '@/types/growthTypes';
import { createChallenge, trackChallengeEvent } from '@/services/growth/studyBuddyService';
import { useAuth } from '@/hooks/useAuth';

interface StudyBuddyChallengeModalProps {
  visible: boolean;
  subject: string;
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  onClose: () => void;
  onChallengeCreated?: (challenge: Challenge) => void;
}

export function StudyBuddyChallengeModal({
  visible,
  subject,
  topic,
  difficulty = 'medium',
  onClose,
  onChallengeCreated,
}: StudyBuddyChallengeModalProps) {
  const [creating, setCreating] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const { user } = useAuth(); // PR30: Detect user role
  
  // PR30: Determine if this is a parent
  const isParent = user?.userType === 'parent';

  const handleCreateChallenge = async () => {
    setCreating(true);
    try {
      const result = await createChallenge(subject, topic, difficulty);
      setChallenge(result.challenge);
      setShareUrl(result.shareUrl);
      
      await trackChallengeEvent('challenge_created', result.challenge.challengeId, {
        subject,
        topic,
        difficulty,
      });
      
      onChallengeCreated?.(result.challenge);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create challenge. Please try again.');
      console.error('Create challenge error:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleShare = async () => {
    if (!challenge || !shareUrl) return;

    try {
      // PR30: Parent-specific messaging
      await Share.share({
        message: isParent
          ? `👨‍👩‍👧‍👦 Time for a fun challenge! Let's practice "${topic}" together.\n\nComplete this to earn rewards!\n\n${shareUrl}`
          : `🎯 Beat my score! I just completed "${topic}" - can you do better?\n\nEarn ${challenge.rewards.xp} XP + Streak Shield!\n\n${shareUrl}`,
        title: isParent ? 'Parent-Child Challenge' : 'Study Buddy Challenge',
      });

      await trackChallengeEvent('challenge_sent', challenge.challengeId);
      
      Alert.alert(
        'Challenge Shared!',
        isParent 
          ? 'Your child will love practicing with you!'
          : 'Your friend will earn rewards too when they complete it!',
        [{ text: 'Awesome!', onPress: onClose }]
      );
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Share failed:', error);
        Alert.alert('Error', 'Failed to share challenge.');
      }
    }
  };

  const getRewardXP = () => {
    const xpMap = { easy: 30, medium: 50, hard: 75 };
    return xpMap[difficulty];
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#4facfe', '#00f2fe']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>

            <View style={styles.content}>
              <Text style={styles.emoji}>{isParent ? '👨‍👩‍👧‍👦' : '🎯'}</Text>
              <Text style={styles.title}>
                {isParent ? 'Challenge Your Child!' : 'Challenge a Friend!'}
              </Text>
              <Text style={styles.subtitle}>
                {isParent
                  ? `Create a fun ${subject} practice challenge for your child`
                  : `Share your ${subject} quiz and earn rewards together`}
              </Text>

              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Ionicons name="book" size={20} color="#4facfe" />
                  <Text style={styles.detailText}>{topic}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="speedometer" size={20} color="#4facfe" />
                  <Text style={styles.detailText}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="help-circle" size={20} color="#4facfe" />
                  <Text style={styles.detailText}>5 questions</Text>
                </View>
              </View>

              <View style={styles.rewardsBox}>
                <Text style={styles.rewardsTitle}>Rewards for Both:</Text>
                <View style={styles.rewardItem}>
                  <Ionicons name="star" size={20} color="#FFD700" />
                  <Text style={styles.rewardText}>+{getRewardXP()} XP</Text>
                </View>
                <View style={styles.rewardItem}>
                  <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                  <Text style={styles.rewardText}>Streak Shield (24h)</Text>
                </View>
              </View>

              {!challenge ? (
                <TouchableOpacity
                  style={[styles.button, creating && styles.buttonDisabled]}
                  onPress={handleCreateChallenge}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={20} color="white" />
                      <Text style={styles.buttonText}>Create Challenge</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.button} onPress={handleShare}>
                  <Ionicons name="share-social" size={20} color="white" />
                  <Text style={styles.buttonText}>Send Challenge</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    padding: 5,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 15,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  rewardsBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 10,
    fontWeight: '500',
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
});

