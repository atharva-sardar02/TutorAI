import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserPercentile } from '@/hooks/useUserPercentile';
import { useAuth } from '@/hooks/useAuth';

interface PercentileCardProps {
  role: 'tutor' | 'parent';
}

export function PercentileCard({ role }: PercentileCardProps) {
  const { user } = useAuth();
  const { stats, loading } = useUserPercentile(user?.uid);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (!loading && stats) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Fire analytics events
      if (stats.monthlyPercentile >= 0) {
        // percentile_card_viewed event
        console.log('[Analytics] percentile_card_viewed', {
          role,
          percentile: stats.monthlyPercentile,
          xp: stats.monthlyXp,
        });
      }

      // profile_xp_seen event
      console.log('[Analytics] profile_xp_seen', {
        role,
        xp: stats.monthlyXp,
        challenges: stats.monthlyChallenges,
      });
    }
  }, [loading, stats, fadeAnim, scaleAnim, role]);

  if (loading || !stats) {
    return null;
  }

  // Don't show percentile if insufficient data
  if (stats.monthlyPercentile < 0) {
    return (
      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.titleSmall, isDark && styles.textDark]}>
          Your Progress This Month
        </Text>
        <View style={styles.xpChip}>
          <Text style={styles.xpText}>{stats.monthlyXp} XP</Text>
          <Text style={[styles.xpSubtext, isDark && styles.subtextDark]}>
            {stats.monthlyChallenges} {stats.monthlyChallenges === 1 ? 'challenge' : 'challenges'}
          </Text>
        </View>
      </View>
    );
  }

  const gradientColors: [string, string, ...string[]] = isDark
    ? ['#1DB954', '#1ed760', '#1DB954'] // Spotify green gradient
    : ['#1DB954', '#1ed760', '#1DB954'];

  const displayPercentile = 100 - stats.monthlyPercentile; // Invert: "Top X%" instead of "Bottom X%"
  const roleName = role === 'tutor' ? 'Tutors' : 'Parents';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>🏆</Text>
          <Text style={styles.title}>
            You're in the Top {displayPercentile}% of {roleName}
          </Text>
          <Text style={styles.subtitle}>this month</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>{stats.monthlyXp.toLocaleString()}</Text>
              <Text style={styles.statLabel}>XP Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>{stats.monthlyChallenges}</Text>
              <Text style={styles.statLabel}>
                {stats.monthlyChallenges === 1 ? 'Challenge' : 'Challenges'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  gradient: {
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  statBadge: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  // Fallback styles (when insufficient data)
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  titleSmall: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  textDark: {
    color: '#fff',
  },
  xpChip: {
    backgroundColor: '#1DB954',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  xpText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  xpSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  subtextDark: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
});

