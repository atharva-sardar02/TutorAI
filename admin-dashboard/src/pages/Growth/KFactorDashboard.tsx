import React, { useState } from 'react';
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
  Button,
  Chip,
} from '@mui/material';
import { Download, TrendingUp } from '@mui/icons-material';
import { subDays } from 'date-fns';
import { KFactorChart } from '@/components/Charts/KFactorChart';
import { DateRangeFilter } from '@/components/Filters/DateRangeFilter';
import { LoopTypeFilter } from '@/components/Filters/LoopTypeFilter';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { useKFactorMetrics } from '@/hooks/useKFactorMetrics';
import { exportMetrics } from '@/services/exportService';
import { formatNumber, formatPercentage } from '@/utils/formatters';
import type { DateRange, LoopType } from '@/types/metrics';

export function KFactorDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 7), // Changed from 30 to 7 days to show demo data by default
    endDate: new Date(),
  });
  const [loopType, setLoopType] = useState<LoopType>('all');

  const { data, isLoading, error, refetch } = useKFactorMetrics(dateRange, loopType);

  const handleExport = () => {
    if (!data) return;
    
    exportMetrics({
      format: 'csv',
      filename: `k-factor-metrics-${Date.now()}`,
      data: data.byLoop,
      columns: ['loopType', 'kFactor', 'invitesSent', 'conversions', 'conversionRate'],
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading K-Factor metrics..." />;
  }

  if (error) {
    return <ErrorState message="Failed to load K-Factor metrics" onRetry={() => refetch()} />;
  }

  if (!data) {
    return <ErrorState message="No data available" />;
  }

  // Check if we have any data to display
  const hasData = data.byLoop.length > 0 || data.overall > 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          K-Factor Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleExport}
          size="small"
          disabled={!hasData}
        >
          Export CSV
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <LoopTypeFilter value={loopType} onChange={setLoopType} />
      </Box>

      {/* Overall K-Factor */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" fontWeight={700} color="primary.main">
              {data.overall.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overall K-Factor
            </Typography>
          </Box>
        </Box>
        <Chip
          label={data.overall >= 1 ? 'Viral Growth' : 'Sub-Viral'}
          color={data.overall >= 1 ? 'success' : 'warning'}
          sx={{ mt: 2 }}
        />
      </Paper>

      {/* Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <KFactorChart data={data} />
      </Paper>

      {/* Loop Comparison Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          K-Factor by Loop Type
        </Typography>
        {hasData ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Loop Type</strong></TableCell>
                  <TableCell align="right"><strong>K-Factor</strong></TableCell>
                  <TableCell align="right"><strong>Invites Sent</strong></TableCell>
                  <TableCell align="right"><strong>Conversions</strong></TableCell>
                  <TableCell align="right"><strong>Conversion Rate</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.byLoop.map((loop) => (
                  <TableRow key={loop.loopType} hover>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {loop.loopType.replace('_', ' ')}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={loop.kFactor.toFixed(2)}
                        size="small"
                        color={loop.kFactor >= 1 ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">{formatNumber(loop.invitesSent)}</TableCell>
                    <TableCell align="right">{formatNumber(loop.conversions)}</TableCell>
                    <TableCell align="right">{formatPercentage(loop.conversionRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No K-Factor data available for the selected filters.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try adjusting your date range or loop type filter.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

