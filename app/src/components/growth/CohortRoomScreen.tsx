import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useCohortRoom } from '@/hooks/useCohortRoom';
import { joinCohort, leaveCohort } from '@/services/growth/cohortService';
import { ParentPodInviteButton } from './ParentPodInviteButton';
import { useAuth } from '@/hooks/useAuth';

export default function CohortRoomScreen() {
  const params = useLocalSearchParams();
  const cohortId = (params?.cohortId as string) || '';
  const { room, loading } = useCohortRoom(cohortId);
  const { user } = useAuth();
  const isParent = user?.userType === 'parent';

  const handleJoin = useCallback(async () => {
    if (!cohortId) return;
    await joinCohort(cohortId);
  }, [cohortId]);

  const handleLeave = useCallback(async () => {
    if (!cohortId) return;
    await leaveCohort(cohortId);
  }, [cohortId]);

  if (loading) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const participants: string[] = room?.participants || [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cohort Room</Text>
      <Text style={styles.subtitle}>Cohort: {cohortId}</Text>

      <View style={styles.row}>
        <Text style={styles.metric}>Participants: {participants.length}</Text>
        <Text style={styles.metric}>Last Active: {room?.lastActiveAt?.toDate?.().toLocaleString?.() || '-'}</Text>
      </View>

      <FlatList
        data={participants}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.participantItem}>
            <Text style={styles.participantText}>{item}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No participants yet.</Text>}
      />

      {isParent && (
        <View style={{ marginTop: 16, marginBottom: 8 }}>
          <ParentPodInviteButton 
            cohortId={cohortId} 
            cohortName={room?.name || 'Study Group'} 
          />
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.join} onPress={handleJoin}>
          <Text style={styles.btnText}>Join Cohort</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.leave} onPress={handleLeave}>
          <Text style={styles.btnText}>Leave Cohort</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  title: { fontSize: 22, fontWeight: '700', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metric: { fontSize: 14, color: '#333' },
  participantItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  participantText: { color: '#333' },
  empty: { textAlign: 'center', color: '#999', paddingVertical: 20 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  join: { flex: 1, backgroundColor: '#4CAF50', padding: 14, borderRadius: 10, alignItems: 'center' },
  leave: { flex: 1, backgroundColor: '#F44336', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600' },
});
