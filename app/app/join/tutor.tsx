import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { trackReferralClick } from '@/services/growth/referralService';
import { useAuth } from '@/hooks/useAuth';

export default function JoinTutorScreen() {
  const params = useLocalSearchParams();
  const referralId = params.ref as string;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function handleDeepLink() {
      try {
        // Track referral click
        if (referralId) {
          await trackReferralClick(referralId, 'tutor_peer', {});
        }
        
        // If authenticated, navigate to tutor onboarding
        if (user) {
          router.replace({
            pathname: '/selectRole',
            params: { ref: referralId, preselect: 'tutor' },
          });
        } else {
          // Guest: navigate to auth with return path
          router.replace({
            pathname: '/(auth)/login',
            params: { returnTo: '/selectRole', ref: referralId, preselect: 'tutor' },
          });
        }
      } catch (error) {
        console.error('Deep link error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    handleDeepLink();
  }, [referralId, user]);
  
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.text}>Loading tutor invite...</Text>
      </View>
    );
  }
  
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

