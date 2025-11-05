import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTutorPeerReferral } from '@/services/growth/tutorPeerService';

interface TutorPeerReferralModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TutorPeerReferralModal({ visible, onClose }: TutorPeerReferralModalProps) {
  const [complementarySubject, setComplementarySubject] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleCreateReferral = async () => {
    setLoading(true);
    try {
      const result = await createTutorPeerReferral({
        complementarySubject,
        personalMessage,
      });
      
      await Share.share({
        message: `👋 ${result.referrerName} thinks you'd be a great fit for MessageAI!\n\n${personalMessage || 'Join our tutoring community and earn XP for your expertise.'}\n\nComplementary to: ${complementarySubject}\n\n${result.referralUrl}`,
        title: 'Join MessageAI as a Tutor',
      });
      
      Alert.alert(
        'Referral Sent!',
        'Your fellow tutor will earn +50 XP when they join!',
        [{ text: 'Great!', onPress: onClose }]
      );
      
      // Reset form
      setComplementarySubject('');
      setPersonalMessage('');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create referral. Please try again.');
      console.error('Tutor peer referral error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          
          <Text style={styles.title}>🤝 Refer a Tutor</Text>
          <Text style={styles.subtitle}>
            Grow the network! Both you and your referral earn XP.
          </Text>
          
          <Text style={styles.label}>Complementary Subject</Text>
          <TextInput
            style={styles.input}
            value={complementarySubject}
            onChangeText={setComplementarySubject}
            placeholder="e.g., Chemistry, Physics, History"
            placeholderTextColor="#999"
          />
          
          <Text style={styles.label}>Personal Message (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={personalMessage}
            onChangeText={setPersonalMessage}
            placeholder="Add a personal note..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
          
          <View style={styles.rewards}>
            <Text style={styles.rewardsTitle}>Rewards:</Text>
            <Text style={styles.rewardText}>• You earn +100 XP</Text>
            <Text style={styles.rewardText}>• They earn +50 XP</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateReferral}
            disabled={loading || !complementarySubject}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="share-social" size={20} color="white" />
                <Text style={styles.buttonText}>Create Referral Link</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  rewards: {
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  rewardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

