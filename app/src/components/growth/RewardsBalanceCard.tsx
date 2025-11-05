import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getUserBalance } from '@/services/growth/incentivesService';

export default function RewardsBalanceCard() {
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const data = await getUserBalance();
      setBalance(data);
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator />;
  }

  if (!balance) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Rewards</Text>
      
      <View style={styles.balanceRow}>
        <Text style={styles.label}>⭐ XP:</Text>
        <Text style={styles.value}>{balance.xpBalance || 0}</Text>
      </View>
      
      <View style={styles.balanceRow}>
        <Text style={styles.label}>🎟️ Class Passes:</Text>
        <Text style={styles.value}>{balance.classPassCount || 0}</Text>
      </View>
      
      <View style={styles.balanceRow}>
        <Text style={styles.label}>🛡️ Streak Shields:</Text>
        <Text style={styles.value}>{balance.streakShieldCount || 0}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

