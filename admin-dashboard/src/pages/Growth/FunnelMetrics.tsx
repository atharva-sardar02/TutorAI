import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { FunnelChart } from '@/components/Charts/FunnelChart';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { MetricCard } from '@/components/Cards/MetricCard';
import { useFunnelMetrics } from '@/hooks/useFunnelMetrics';
import { formatNumber, formatPercentage, formatDuration } from '@/utils/formatters';
import { TrendingDown, Timer } from '@mui/icons-material';

export function FunnelMetrics() {
  const { data, isLoading, error, refetch } = useFunnelMetrics();

  if (isLoading) {
    return <LoadingState message="Loading funnel metrics..." />;
  }

  if (error) {
    return <ErrorState message="Failed to load funnel metrics" onRetry={() => refetch()} />;
  }

  if (!data) {
    return <ErrorState message="No data available" />;
  }

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Conversion Funnel
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Overall Conversion"
            value={formatPercentage(data.overallConversionRate)}
            icon={<TrendingDown />}
            subtitle={`${formatNumber(data.totalConverted)} of ${formatNumber(data.totalEntered)} users`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Time to Convert"
            value={formatDuration(data.avgTimeToConvert || 0)}
            icon={<Timer />}
          />
        </Grid>
      </Grid>

      {/* Funnel Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <FunnelChart data={data} />
      </Paper>

      {/* Stage Details */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Stage Breakdown
        </Typography>
        <Grid container spacing={2}>
          {data.stages.map((stage, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {stage.stage}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 1 }}>
                  {formatNumber(stage.count)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatPercentage(stage.conversionRate)} conversion
                </Typography>
                {stage.dropoffRate > 0 && (
                  <Typography variant="caption" color="error.main">
                    {formatPercentage(stage.dropoffRate)} dropoff
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}

