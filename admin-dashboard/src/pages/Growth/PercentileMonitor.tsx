import React from 'react';
import { Grid2 as Grid, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { PercentileHistogram } from '@/components/Charts/PercentileHistogram';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { StatCard } from '@/components/Cards/StatCard';
import { usePercentileStats } from '@/hooks/usePercentileStats';
import { formatNumber, formatXP } from '@/utils/formatters';

export function PercentileMonitor() {
  const { data, isLoading, error, refetch } = usePercentileStats();

  if (isLoading) {
    return <LoadingState message="Loading percentile statistics..." />;
  }

  if (error) {
    return <ErrorState message="Failed to load percentile stats" onRetry={() => refetch()} />;
  }

  if (!data) {
    return <ErrorState message="No data available" />;
  }

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        XP Percentile Monitor
      </Typography>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {data.summary.map((roleStats) => (
          <React.Fragment key={roleStats.role}>
            <Grid item xs={6} sm={3}>
              <StatCard
                label={`Total ${roleStats.role === 'tutor' ? 'Tutors' : 'Parents'}`}
                value={formatNumber(roleStats.totalUsers)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                label={`Avg XP (${roleStats.role === 'tutor' ? 'Tutors' : 'Parents'})`}
                value={formatNumber(roleStats.avgXp)}
              />
            </Grid>
          </React.Fragment>
        ))}
      </Grid>

      {/* Histogram */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <PercentileHistogram data={data} />
      </Paper>

      {/* Role Comparison Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          XP Statistics by Role
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell align="right"><strong>Total Users</strong></TableCell>
                <TableCell align="right"><strong>Avg XP</strong></TableCell>
                <TableCell align="right"><strong>Median XP</strong></TableCell>
                <TableCell align="right"><strong>Top 10% XP</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.summary.map((roleStats) => (
                <TableRow key={roleStats.role} hover>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{roleStats.role}</TableCell>
                  <TableCell align="right">{formatNumber(roleStats.totalUsers)}</TableCell>
                  <TableCell align="right">{formatXP(roleStats.avgXp)}</TableCell>
                  <TableCell align="right">{formatXP(roleStats.medianXp)}</TableCell>
                  <TableCell align="right">{formatXP(roleStats.top10PercentXp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

