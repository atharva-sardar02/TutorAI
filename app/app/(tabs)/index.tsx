import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Button, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/index';
import TutorOverview from '@/components/TutorOverview';
import ParentOverview from '@/components/ParentOverview';
import { createReferralLink } from '@/services/growth/referralService';
import { getOrchestratorDecision } from '@/services/growth/orchestratorService';
import { issueReward, getUserBalance } from '@/services/growth/incentivesService';
import { TutorCardModal } from '@/components/growth/TutorCardModal';
import ActivityFeed from '@/components/ActivityFeed';
import { LeaderboardCard } from '@/components/growth/LeaderboardCard';
import { ProgressStoryCard } from '@/components/growth/ProgressStoryCard';
import { StudyBuddyChallengeModal } from '@/components/growth/StudyBuddyChallengeModal';
import { useLocalSearchParams } from 'expo-router';

export default function OverviewScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams(); // PR30: Get navigation params
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorCardModal, setShowTutorCardModal] = useState(false);
  // PR30: Challenge modal state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeSubject, setChallengeSubject] = useState('');
  const [challengeTopic, setChallengeTopic] = useState('');
  const [challengeDifficulty, setChallengeDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);
  
  // PR30: Handle challenge creation trigger from Progress Reel
  useEffect(() => {
    if (params.createChallenge === 'true' && params.subject && params.topic) {
      setChallengeSubject(params.subject as string);
      setChallengeTopic(params.topic as string);
      setChallengeDifficulty((params.difficulty as 'easy' | 'medium' | 'hard') || 'medium');
      setShowChallengeModal(true);
    }
  }, [params]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!userData?.role) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Test function for PR15
  const testReferralLink = async () => {
    try {
      console.log('🧪 Testing referral link generation...');
      const result = await createReferralLink({ 
        loopType: 'tutor_card',
        metadata: { channel: 'test' }
      });
      console.log('✅ Link generated:', result.url);
      console.log('✅ Referral ID:', result.referralId);
      console.log('✅ Provider:', result.provider);
      Alert.alert(
        'Success! 🎉', 
        `Link: ${result.url.substring(0, 50)}...\n\nCheck console for full link and Firebase Console for /referrals collection`
      );
    } catch (err: any) {
      console.error('❌ Error:', err);
      Alert.alert('Error ❌', err.message);
    }
  };

  // Test function for PR16
  const testOrchestrator = async () => {
    try {
      console.log('🎯 Testing orchestrator decision...');
      const decision = await getOrchestratorDecision({
        userRole: userData?.role || 'tutor',
        sessionContext: {
          rating: 5.0,
          sessionCount: 10,
          conversationId: 'test_conv',
        },
      });
      
      console.log('✅ Decision:', decision);
      
      if (decision.shouldShow) {
        Alert.alert(
          'Show Prompt! ✅',
          `Loop: ${decision.loopType}\nCopy: ${decision.copyKey}\nRationale: ${decision.rationale}\n\nCheck /cooldowns and /loop_exposures in Firestore`
        );
      } else {
        Alert.alert(
          'Throttled ⏸️',
          `Rationale: ${decision.rationale}\n\nUser not eligible or on cooldown`
        );
      }
    } catch (err: any) {
      console.error('❌ Error:', err);
      Alert.alert('Error ❌', err.message);
    }
  };

  // Test function for PR25
  const testRewards = async () => {
    try {
      console.log('💰 Testing reward system...');
      
      // Use a stable requestKey for idempotency testing
      // In production, this would be generated per unique action
      const testRequestKey = `test_${user?.uid}_tutor_card_001`;
      
      // Issue reward with requestKey
      const issueResult = await issueReward('tutor_card', {
        rating: 5.0,
        sessionCount: 10,
        subject: 'math', // Math tutors get +10% (110 XP instead of 100)
      }, testRequestKey);
      console.log('✅ Reward issued:', issueResult);
      
      // Get balance
      const balance = await getUserBalance();
      console.log('📊 Balance:', balance);
      
      Alert.alert(
        'Rewards Test ✅', 
        `Success: ${issueResult.success}\n` +
        `Reward: ${issueResult.reward?.amount} ${issueResult.reward?.type}\n` +
        `Rationale: ${issueResult.rationale}\n\n` +
        `💰 XP Balance: ${balance.xpBalance}\n` +
        `🎟️ Class Passes: ${balance.classPassCount}\n` +
        `🛡️ Streak Shields: ${balance.streakShieldCount}\n\n` +
        `Check /rewards, /balances, and /rewards_audit_log in Firestore`
      );
    } catch (err: any) {
      console.error('❌ Error:', err);
      Alert.alert('Error ❌', err.message);
    }
  };

  // Render role-specific overview
  return (
    <ScrollView style={{ flex: 1 }}>
      {/* PR21: Activity Feed */}
      <ActivityFeed />

      {/* PR19+: Progress Story Card (Spotify Wrapped-style) */}
      <ProgressStoryCard />

      {/* PR27: Mini-Leaderboard */}
      <View style={{ padding: 10 }}>
        <LeaderboardCard />
      </View>

      {/* PR15, PR16, PR25, PR18 Test Buttons - Remove after testing */}
      <View style={styles.testButtonContainer}>
        <Button 
          title="🧪 Test PR15 Referral Link"
          onPress={testReferralLink}
          color="#FF6B6B"
        />
        <View style={{ height: 8 }} />
        <Button 
          title="🎯 Test PR16 Orchestrator"
          onPress={testOrchestrator}
          color="#4CAF50"
        />
        <View style={{ height: 8 }} />
        <Button 
          title="💰 Test PR25 Rewards"
          onPress={testRewards}
          color="#FF9800"
        />
        {userData.role === 'tutor' && (
          <>
            <View style={{ height: 8 }} />
            <Button 
              title="📇 Test PR18 Tutor Card"
              onPress={() => setShowTutorCardModal(true)}
              color="#9C27B0"
            />
          </>
        )}
      </View>
      
      {userData.role === 'tutor' 
        ? <TutorOverview userData={userData} />
        : <ParentOverview userData={userData} />}
      
      {/* PR18 Tutor Card Modal */}
      {userData.role === 'tutor' && (
        <TutorCardModal
          visible={showTutorCardModal}
          tutorId={user?.uid || ''}
          onClose={() => setShowTutorCardModal(false)}
        />
      )}
      
      {/* PR30: Parent Challenge Modal */}
      {showChallengeModal && challengeSubject && challengeTopic && (
        <StudyBuddyChallengeModal
          visible={showChallengeModal}
          subject={challengeSubject}
          topic={challengeTopic}
          difficulty={challengeDifficulty}
          onClose={() => setShowChallengeModal(false)}
          onChallengeCreated={(challenge) => {
            console.log('Challenge created from Progress Reel:', challenge.challengeId);
            setShowChallengeModal(false);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  testButtonContainer: {
    padding: 10,
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
});
