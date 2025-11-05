import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

const functions = getFunctions();

export function PrivacySettings() {
  const [optOut, setOptOut] = useState(false);

  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, 'users', uid));
      const data = snap.data() as any;
      setOptOut(Boolean(data?.privacy?.leaderboardOptOut));
    })();
  }, []);

  const onToggle = useCallback(async (value: boolean) => {
    setOptOut(value);
    const fn = httpsCallable(functions, 'setLeaderboardOptOut');
    await fn({ enabled: value });
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Privacy</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Show me on leaderboards</Text>
        <Switch value={!optOut} onValueChange={(v) => onToggle(!v)} />
      </View>
      <Text style={styles.note}>Disable to hide your name from public leaderboards.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: '#333', fontSize: 16 },
  note: { color: '#777', fontSize: 12, marginTop: 8 },
});
