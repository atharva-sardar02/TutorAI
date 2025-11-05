import React, { useEffect, useState } from 'react';
import { Typography, Paper, Box, List, ListItem, ListItemText, Chip } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { People, TrendingUp, Science, Security } from '@mui/icons-material';
import { MetricCard } from '@/components/Cards/MetricCard';
import { StatCard } from '@/components/Cards/StatCard';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { getDashboardStats, subscribeToRecentActivity } from '@/services/firestoreService';
import type { DashboardStats, ActivityLogEntry } from '@/services/firestoreService';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch dashboard stats
    const loadStats = async () => {
      try {
        setLoading(true);
        const data = await getDashboardStats();
        setStats(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Subscribe to recent activity
    const unsubscribe = subscribeToRecentActivity((activities) => {
      setRecentActivity(activities);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (error || !stats) {
    return <ErrorState message={error || 'Failed to load data'} />;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Dashboard Overview
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={<People />}
            subtitle="All registered users"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Today"
            value={stats.activeToday.toLocaleString()}
            icon={<TrendingUp />}
            trend={{ value: 12, isPositive: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Weekly Growth"
            value={`+${stats.weeklyGrowth}`}
            icon={<People />}
            subtitle="New users this week"
            trend={{ value: 8, isPositive: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="K-Factor"
            value={stats.kFactor.toFixed(2)}
            icon={<TrendingUp />}
            subtitle="Viral coefficient"
            trend={{ value: 5, isPositive: true }}
          />
        </Grid>
      </Grid>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Recent Activity
            </Typography>
            {recentActivity.length > 0 ? (
              <List>
                {recentActivity.map((activity) => (
                  <ListItem
                    key={activity.id}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <ListItemText
                      primary={activity.action}
                      secondary={`${activity.adminEmail} • ${formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No recent activity
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Quick Stats
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <StatCard label="Pending Fraud" value={stats.pendingFraud} color="error.main" />
              <StatCard label="Active Experiments" value={stats.activeExperiments} color="primary.main" />
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              System Status
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip label="All Systems Operational" color="success" size="small" />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Last updated: {new Date().toLocaleTimeString()}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

