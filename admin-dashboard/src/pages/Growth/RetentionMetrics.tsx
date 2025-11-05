import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { RetentionChart } from '@/components/Charts/RetentionChart';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { useRetentionMetrics } from '@/hooks/useRetentionMetrics';
import { formatDate, formatPercentage, formatNumber } from '@/utils/formatters';

export function RetentionMetrics() {
  const { data, isLoading, error, refetch } = useRetentionMetrics();

  if (isLoading) {
    return <LoadingState message="Loading retention metrics..." />;
  }

  if (error) {
    return <ErrorState message="Failed to load retention metrics" onRetry={() => refetch()} />;
  }

  if (!data) {
    return <ErrorState message="No data available" />;
  }

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Retention Analysis
      </Typography>

      {/* Retention Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <RetentionChart data={data} />
      </Paper>

      {/* Cohort Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Cohort Retention Table
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Cohort Date</strong></TableCell>
                <TableCell align="right"><strong>Size</strong></TableCell>
                <TableCell align="right"><strong>Day 1</strong></TableCell>
                <TableCell align="right"><strong>Day 7</strong></TableCell>
                <TableCell align="right"><strong>Day 14</strong></TableCell>
                <TableCell align="right"><strong>Day 30</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.cohorts.map((cohort) => {
                const retentionMap: Record<number, number> = {};
                cohort.retention.forEach((r) => {
                  retentionMap[r.day] = r.retentionRate;
                });

                return (
                  <TableRow key={cohort.cohortDate} hover>
                    <TableCell>{formatDate(new Date(cohort.cohortDate))}</TableCell>
                    <TableCell align="right">{formatNumber(cohort.size)}</TableCell>
                    <TableCell align="right">
                      {retentionMap[1] ? formatPercentage(retentionMap[1]) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {retentionMap[7] ? formatPercentage(retentionMap[7]) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {retentionMap[14] ? formatPercentage(retentionMap[14]) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {retentionMap[30] ? formatPercentage(retentionMap[30]) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

