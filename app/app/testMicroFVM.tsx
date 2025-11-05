/**
 * Test Screen for PR26: Micro-FVM
 * 
 * Navigate to /testMicroFVM to test the 5-question assessment
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MicroFVMScreen } from '@/components/growth/MicroFVMScreen';

export default function TestMicroFVMScreen() {
  const [showFVM, setShowFVM] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('Math');
  const [lastResult, setLastResult] = useState<{ subject: string; score: number } | null>(null);

  const handleStartTest = (subject: string) => {
    setSelectedSubject(subject);
    setShowFVM(true);
  };

  const handleComplete = (score: number) => {
    setLastResult({ subject: selectedSubject, score });
    setShowFVM(false);
    
    Alert.alert(
      '✅ Assessment Complete!',
      `${selectedSubject}: ${score}% (${Math.round(score / 20)} out of 5 correct)`,
      [
        { text: 'OK' }
      ]
    );
  };

  const handleCancel = () => {
    setShowFVM(false);
    Alert.alert('Cancelled', 'Assessment cancelled');
  };

  if (showFVM) {
    return (
      <MicroFVMScreen
        subject={selectedSubject}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Micro-FVM Test</Text>
          <Text style={styles.subtitle}>5-Question Quick Assessment</Text>
        </View>

        {/* Last Result */}
        {lastResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Last Result</Text>
            <Text style={styles.resultText}>
              {lastResult.subject}: {lastResult.score}%
            </Text>
            <Text style={styles.resultSubtext}>
              ({Math.round(lastResult.score / 20)} out of 5 correct)
            </Text>
          </View>
        )}

        {/* Subject Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select a Subject</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.mathButton]}
            onPress={() => handleStartTest('Math')}
          >
            <Text style={styles.buttonEmoji}>🔢</Text>
            <Text style={styles.buttonText}>Math Assessment</Text>
            <Text style={styles.buttonSubtext}>Algebra, geometry, fractions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.scienceButton]}
            onPress={() => handleStartTest('Science')}
          >
            <Text style={styles.buttonEmoji}>🔬</Text>
            <Text style={styles.buttonText}>Science Assessment</Text>
            <Text style={styles.buttonSubtext}>Biology, physics, earth science</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.englishButton]}
            onPress={() => handleStartTest('English')}
          >
            <Text style={styles.buttonEmoji}>📚</Text>
            <Text style={styles.buttonText}>English Assessment</Text>
            <Text style={styles.buttonSubtext}>Grammar, vocabulary, reading</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What to Test:</Text>
          <Text style={styles.infoText}>✅ Questions load in &lt;2 seconds</Text>
          <Text style={styles.infoText}>✅ Timer starts automatically</Text>
          <Text style={styles.infoText}>✅ Progress shows (1/5, 2/5, etc.)</Text>
          <Text style={styles.infoText}>✅ Answer selection works</Text>
          <Text style={styles.infoText}>✅ Score displayed after submit</Text>
          <Text style={styles.infoText}>✅ Complete in &lt;90 seconds</Text>
          <Text style={styles.infoText}>✅ Session saved in Firestore</Text>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back to App</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  resultCard: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  resultSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mathButton: {
    backgroundColor: '#2196F3',
  },
  scienceButton: {
    backgroundColor: '#9C27B0',
  },
  englishButton: {
    backgroundColor: '#FF9800',
  },
  buttonEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});

