/**
 * Consent Explainer Component
 * PR19: Progress Reels
 * 
 * COPPA/FERPA compliant consent flow
 * Explains what gets shared, what stays private, and user controls
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ConsentExplainerProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentExplainer({ onAccept, onDecline }: ConsentExplainerProps) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={64} color="#4CAF50" />
        <Text style={styles.title}>Share Your Student's Progress</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What gets shared:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Session highlights (achievements)</Text>
          <Text style={styles.bullet}>• Topics covered</Text>
          <Text style={styles.bullet}>• Progress summary</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What stays private:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Student names (redacted)</Text>
          <Text style={styles.bullet}>• School names (redacted)</Text>
          <Text style={styles.bullet}>• Contact information</Text>
          <Text style={styles.bullet}>• Full session transcript</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your control:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Preview before sharing</Text>
          <Text style={styles.bullet}>• Revoke anytime in settings</Text>
          <Text style={styles.bullet}>• Reels auto-delete after 30 days</Text>
        </View>
      </View>
      
      <View style={styles.exampleBox}>
        <Text style={styles.exampleTitle}>Example Highlight:</Text>
        <Text style={styles.exampleText}>
          "Student mastered solving quadratic equations using factoring and demonstrated excellent understanding of the discriminant concept."
        </Text>
      </View>
      
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptButtonText}>Allow Sharing</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
          <Text style={styles.declineButtonText}>Not Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  bulletList: {
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 24,
  },
  exampleBox: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  exampleText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  buttons: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  declineButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 12,
  },
  declineButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

