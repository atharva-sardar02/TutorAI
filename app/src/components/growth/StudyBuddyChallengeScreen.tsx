/**
 * Study Buddy Challenge Screen
 * PR23: Participant view for completing challenges
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Challenge, ChallengeQuestion } from '@/types/growthTypes';
import {
  getChallengeById,
  joinChallenge,
  submitChallengeAnswers,
  trackChallengeEvent,
} from '@/services/growth/studyBuddyService';
import { useAuth } from '@/hooks/useAuth';

export default function StudyBuddyChallengeScreen() {
  const { challengeId } = useLocalSearchParams();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (challengeId && user) {
      loadChallenge();
    }
  }, [challengeId, user]);

  async function loadChallenge() {
    try {
      const data = await getChallengeById(challengeId as string);
      setChallenge(data);

      // Initialize answers array
      setSelectedAnswers(new Array(data.questions.length).fill(''));

      // Track view
      await trackChallengeEvent('challenge_opened', data.challengeId);

      // Auto-join if pending
      if (data.status === 'pending') {
        await joinChallenge(challengeId as string);
        await trackChallengeEvent('challenge_started', data.challengeId);
      }
    } catch (error: any) {
      console.error('Error loading challenge:', error);
      Alert.alert('Error', error.message || 'Failed to load challenge', [
        { text: 'Go Back', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectAnswer(answer: string) {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answer;
    setSelectedAnswers(newAnswers);
  }

  function handleNext() {
    if (currentQuestion < (challenge?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  }

  function handlePrevious() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }

  async function handleSubmit() {
    if (!challenge) return;

    // Check if all questions answered
    if (selectedAnswers.some((ans) => !ans)) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitChallengeAnswers(challenge.challengeId, selectedAnswers);

      await trackChallengeEvent('challenge_completed', challenge.challengeId, {
        score: result.score,
        correctAnswers: result.correctAnswers,
      });

      // Show results
      Alert.alert(
        'Challenge Complete! 🎉',
        `You scored ${result.score}%\n\n` +
          `Correct answers: ${result.correctAnswers}/${result.totalQuestions}\n\n` +
          `Rewards earned:\n` +
          `✅ +${challenge.rewards.xp} XP\n` +
          `${challenge.rewards.streakShield ? '🛡️ Streak Shield (24h)' : ''}`,
        [{ text: 'Awesome!', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to submit answers. Please try again.');
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4facfe" />
        <Text style={styles.loadingText}>Loading Challenge...</Text>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Challenge not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const question = challenge.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / challenge.questions.length) * 100;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `${challenge.subject} Challenge` }} />

      <LinearGradient
        colors={['#4facfe', '#00f2fe']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>{challenge.topic}</Text>
        <Text style={styles.headerSubtitle}>
          Question {currentQuestion + 1} of {challenge.questions.length}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.questionText}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const isSelected = selectedAnswers[currentQuestion] === option;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                onPress={() => handleSelectAnswer(option)}
              >
                <View
                  style={[
                    styles.optionRadio,
                    isSelected && styles.optionRadioSelected,
                  ]}
                >
                  {isSelected && <View style={styles.optionRadioInner} />}
                </View>
                <Text
                  style={[styles.optionText, isSelected && styles.optionTextSelected]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestion === 0 && styles.navButtonDisabled]}
            onPress={handlePrevious}
            disabled={currentQuestion === 0}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={currentQuestion === 0 ? '#ccc' : '#4facfe'}
            />
            <Text
              style={[
                styles.navButtonText,
                currentQuestion === 0 && styles.navButtonTextDisabled,
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          {currentQuestion < challenge.questions.length - 1 ? (
            <TouchableOpacity
              style={[
                styles.navButton,
                !selectedAnswers[currentQuestion] && styles.navButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!selectedAnswers[currentQuestion]}
            >
              <Text
                style={[
                  styles.navButtonText,
                  !selectedAnswers[currentQuestion] && styles.navButtonTextDisabled,
                ]}
              >
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={!selectedAnswers[currentQuestion] ? '#ccc' : '#4facfe'}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                (submitting || selectedAnswers.some((ans) => !ans)) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || selectedAnswers.some((ans) => !ans)}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4facfe',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionButtonSelected: {
    borderColor: '#4facfe',
    backgroundColor: '#f0f9ff',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    borderColor: '#4facfe',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4facfe',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  optionTextSelected: {
    color: '#4facfe',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
  },
  navButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  navButtonText: {
    fontSize: 16,
    color: '#4facfe',
    fontWeight: '600',
    marginHorizontal: 4,
  },
  navButtonTextDisabled: {
    color: '#ccc',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

