import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Share, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createParentPodInvite } from '@/services/growth/parentPodService';

interface ParentPodInviteButtonProps {
  cohortId: string;
  cohortName: string;
}

export function ParentPodInviteButton({ cohortId, cohortName }: ParentPodInviteButtonProps) {
  const [loading, setLoading] = useState(false);
  
  const handleInvite = async () => {
    setLoading(true);
    try {
      const result = await createParentPodInvite(cohortId, cohortName);
      
      await Share.share({
        message: `👨‍👩‍👧‍👦 Join our parent pod "${cohortName}"!\n\nConnect with other parents, share tips, and support our kids together.\n\n${result.inviteUrl}`,
        title: `Join ${cohortName} on MessageAI`,
      });
      
      Alert.alert('Invite Sent!', 'Other parents can now join your cohort.');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create invite. Please try again.');
      console.error('Parent pod invite error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={handleInvite}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <Ionicons name="people" size={20} color="white" />
          <Text style={styles.buttonText}>Invite Parents</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

