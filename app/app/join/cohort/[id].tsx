import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { trackReferralClick } from '@/services/growth/referralService';
import { useAuth } from '@/hooks/useAuth';

export default function JoinCohortScreen() {
  const params = useLocalSearchParams();
  const cohortId = params.id as string;
  const referralId = params.ref as string;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function handleDeepLink() {
      try {
        // Track referral click
        if (referralId) {
          await trackReferralClick(referralId, 'parent_pod', {});
        }
        
        // If authenticated, navigate to cohort room
        if (user) {
          router.replace({
            pathname: '/cohortRoom',
            params: { cohortId, invitedBy: referralId },
          });
        } else {
          // Guest: navigate to auth with return path
          router.replace({
            pathname: '/(auth)/login',
            params: { returnTo: `/join/cohort/${cohortId}`, ref: referralId },
          });
        }
      } catch (error) {
        console.error('Deep link error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    handleDeepLink();
  }, [cohortId, referralId, user]);
  
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.text}>Loading invite...</Text>
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

