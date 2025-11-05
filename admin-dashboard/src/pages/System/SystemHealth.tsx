import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { StatCard } from '@/components/Cards/StatCard';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { formatNumber, formatDate } from '@/utils/formatters';

export function SystemHealth() {
  const { data: health, isLoading, isError, error } = useSystemHealth();

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={error?.message || 'Failed to load system health.'} />;
  }

  if (!health) {
    return <ErrorState message="No health data available." />;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle color="success" />;
      case 'degraded': return <Warning color="warning" />;
      case 'down': return <ErrorIcon color="error" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'healthy': case 'success': return 'success';
      case 'degraded': case 'pending': return 'warning';
      case 'down': case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          System Health
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor system status, resource usage, and scheduled jobs
        </Typography>
      </Box>

      {/* Firestore Stats */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Firestore Usage (24h)
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Reads"
              value={formatNumber(health.firestore.reads24h)}
              subtext="Last 24 hours"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Writes"
              value={formatNumber(health.firestore.writes24h)}
              subtext="Last 24 hours"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Deletes"
              value={formatNumber(health.firestore.deletes24h)}
              subtext="Last 24 hours"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Storage"
              value={`${formatNumber(health.firestore.storageUsedMB)} MB`}
              subtext="Database size"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Storage & API Quotas */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Storage & API Quotas
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Storage Usage
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                <Typography variant="h4">
                  {health.storage.usedGB.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                  / {health.storage.limitGB} GB
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={health.storage.percentUsed}
                color={health.storage.percentUsed > 80 ? 'warning' : 'primary'}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {health.storage.percentUsed.toFixed(1)}% used
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                OpenAI Quota
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                <Typography variant="h4">
                  {formatNumber(health.apiQuotas.openai.used)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                  / {formatNumber(health.apiQuotas.openai.limit)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={health.apiQuotas.openai.percentUsed}
                color={health.apiQuotas.openai.percentUsed > 80 ? 'warning' : 'primary'}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {health.apiQuotas.openai.percentUsed.toFixed(1)}% used
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Firebase Quota
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                <Typography variant="h4">
                  {formatNumber(health.apiQuotas.firebase.used)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                  / {formatNumber(health.apiQuotas.firebase.limit)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={health.apiQuotas.firebase.percentUsed}
                color={health.apiQuotas.firebase.percentUsed > 80 ? 'warning' : 'primary'}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {health.apiQuotas.firebase.percentUsed.toFixed(1)}% used
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Cloud Functions Status */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Cloud Functions
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Function</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell align="right">Error Rate</TableCell>
                <TableCell align="right">Avg Duration</TableCell>
                <TableCell align="right">Invocations (24h)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {health.functions.map((func) => (
                <TableRow key={func.name}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {func.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(func.status)}
                      label={func.status}
                      size="small"
                      color={getStatusColor(func.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {func.lastRun && (
                      <Typography variant="caption">
                        {formatDate(func.lastRun.toDate())}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${(func.errorRate * 100).toFixed(2)}%`}
                      size="small"
                      color={func.errorRate > 0.05 ? 'error' : 'success'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {func.avgDuration.toFixed(0)} ms
                  </TableCell>
                  <TableCell align="right">
                    {formatNumber(func.invocations24h)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Scheduled Jobs */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Scheduled Jobs
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Job Name</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell>Next Run</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {health.scheduledJobs.map((job) => (
                <TableRow key={job.name}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {job.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace">
                      {job.schedule}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {formatDate(job.lastRun.toDate())}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {formatDate(job.nextRun.toDate())}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={job.status}
                      size="small"
                      color={getStatusColor(job.status)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Last Updated */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Last updated: {formatDate(health.lastUpdated.toDate())}
        </Typography>
      </Box>
    </Box>
  );
}

