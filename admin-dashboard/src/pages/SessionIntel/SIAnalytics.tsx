import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
} from '@mui/material';
import { Warning, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { TimeSeriesChart } from '@/components/Charts/TimeSeriesChart';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { MetricCard } from '@/components/Cards/MetricCard';
import { useSIAnalytics } from '@/hooks/useSIAnalytics';
import { formatNumber, formatPercentage, formatRelativeTime } from '@/utils/formatters';

export function SIAnalytics() {
  const { data: analytics, isLoading, error, refetch } = useSIAnalytics();

  if (isLoading) {
    return <LoadingState message="Loading SI analytics..." />;
  }

  if (error) {
    return <ErrorState message="Failed to load SI analytics" onRetry={() => refetch()} />;
  }

  if (!analytics) {
    return <ErrorState message="No analytics data available" />;
  }

  // Prepare time-series data for chart (mock for now)
  const timeSeriesData = [
    { date: new Date(Date.now() - 6 * 86400000).toISOString(), recordings: 8, transcriptions: 7 },
    { date: new Date(Date.now() - 5 * 86400000).toISOString(), recordings: 10, transcriptions: 9 },
    { date: new Date(Date.now() - 4 * 86400000).toISOString(), recordings: 6, transcriptions: 6 },
    { date: new Date(Date.now() - 3 * 86400000).toISOString(), recordings: 12, transcriptions: 11 },
    { date: new Date(Date.now() - 2 * 86400000).toISOString(), recordings: 9, transcriptions: 8 },
    { date: new Date(Date.now() - 1 * 86400000).toISOString(), recordings: 7, transcriptions: 7 },
    { date: new Date().toISOString(), recordings: 5, transcriptions: 4 },
  ];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <ErrorIcon fontSize="small" />;
      case 'medium':
        return <Warning fontSize="small" />;
      default:
        return <CheckCircle fontSize="small" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  // Helper to safely format event type
  const formatEventType = (eventType: string | undefined): string => {
    if (!eventType) return 'Unknown';
    return eventType.replace(/_/g, ' ');
  };

  // Helper to safely format alert type
  const formatAlertType = (alertType: string | undefined): string => {
    if (!alertType) return 'Unknown Alert';
    return alertType.replace(/_/g, ' ').toUpperCase();
  };

  // Validate and filter events to ensure data integrity
  const validEvents = (analytics.events || []).filter(event => 
    event && event.id && event.timestamp
  );

  // Validate and filter alerts
  const validAlerts = (analytics.alerts || []).filter(alert =>
    alert && alert.id && alert.message && alert.timestamp
  );

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Session Intelligence Analytics
      </Typography>

      {/* Summary Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Recordings"
            value={formatNumber(analytics.summary.totalRecordings)}
            icon={<CheckCircle />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Transcriptions"
            value={formatNumber(analytics.summary.totalTranscriptions)}
            icon={<CheckCircle />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Processing Time"
            value={`${(analytics.summary.avgProcessingTime / 1000).toFixed(1)}s`}
            icon={<CheckCircle />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Error Rate"
            value={formatPercentage(analytics.summary.errorRate)}
            icon={analytics.summary.errorRate > 5 ? <ErrorIcon /> : <CheckCircle />}
          />
        </Grid>
      </Grid>

      {/* Alerts */}
      {validAlerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Active Alerts
          </Typography>
          {validAlerts.map((alert) => (
            <Alert
              key={alert.id}
              severity={getSeverityColor(alert.severity || 'info') as any}
              icon={getSeverityIcon(alert.severity || 'low')}
              sx={{ mb: 1 }}
            >
              <strong>{formatAlertType(alert.alertType)}:</strong> {alert.message || 'No message'}
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {alert.timestamp ? formatRelativeTime(alert.timestamp.toDate()) : 'Recently'}
              </Typography>
            </Alert>
          ))}
        </Box>
      )}

      {/* Time Series Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <TimeSeriesChart
          data={timeSeriesData}
          title="Recording & Transcription Activity"
          lines={[
            { dataKey: 'recordings', name: 'Recordings Uploaded', color: '#1DB954' },
            { dataKey: 'transcriptions', name: 'Transcriptions Complete', color: '#1ed760' },
          ]}
        />
      </Paper>

      {/* Recent Events */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Recent Events
        </Typography>
        {validEvents.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Event Type</strong></TableCell>
                  <TableCell><strong>Conversation</strong></TableCell>
                  <TableCell align="right"><strong>Duration</strong></TableCell>
                  <TableCell align="right"><strong>Time</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {validEvents.slice(0, 10).map((event) => (
                  <TableRow key={event.id} hover>
                    <TableCell>
                      <Chip
                        label={formatEventType(event.eventType)}
                        size="small"
                        color={event.eventType === 'error' ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{event.conversationId || '-'}</TableCell>
                    <TableCell align="right">
                      {event.durationMs ? `${(event.durationMs / 1000).toFixed(1)}s` : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {event.timestamp ? formatRelativeTime(event.timestamp.toDate()) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No events recorded yet
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

