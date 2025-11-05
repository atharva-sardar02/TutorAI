import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLeaderboards } from '@/hooks/useLeaderboards';

const SUBJECTS = ['All'];
const AGE_BANDS = ['13-15', '16-18', 'unknown'];

export function LeaderboardCard() {
  const [subject, setSubject] = useState<string>('All');
  const [ageBand, setAgeBand] = useState<string>('13-15');
  const { entries, loading } = useLeaderboards(subject, ageBand);

  const header = useMemo(() => (
    <View style={styles.header}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>{subject} • Age {ageBand}</Text>
    </View>
  ), [subject, ageBand]);

  return (
    <View style={styles.card}>
      {header}
      <View style={styles.filters}>
        <View style={styles.row}>
          {SUBJECTS.map((s) => (
            <TouchableOpacity key={s} onPress={() => setSubject(s)} style={[styles.chip, subject === s && styles.chipActive]}>
              <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.row}>
          {AGE_BANDS.map((a) => (
            <TouchableOpacity key={a} onPress={() => setAgeBand(a)} style={[styles.chip, ageBand === a && styles.chipActive]}>
              <Text style={[styles.chipText, ageBand === a && styles.chipTextActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#4CAF50" />
      ) : entries.length === 0 ? (
        <Text style={styles.empty}>No entries yet.</Text>
      ) : (
        <View>
          {entries.map((item) => (
            <View key={item.userId} style={styles.entry}>
              <Text style={styles.rank}>{item.rank}</Text>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.xp}>{item.xp} XP</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16 },
  header: { marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  subtitle: { fontSize: 12, color: '#666' },
  filters: { marginVertical: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 999 },
  chipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  chipText: { color: '#333' },
  chipTextActive: { color: 'white' },
  entry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rank: { width: 28, textAlign: 'center', fontWeight: '700', color: '#4CAF50' },
  name: { flex: 1, color: '#333' },
  xp: { color: '#666' },
  empty: { textAlign: 'center', color: '#999', paddingVertical: 16 },
});
