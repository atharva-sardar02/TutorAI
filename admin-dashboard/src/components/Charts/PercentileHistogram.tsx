import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';
import { formatNumber } from '@/utils/formatters';
import type { PercentileStats } from '@/types/metrics';

interface PercentileHistogramProps {
  data: PercentileStats;
}

export function PercentileHistogram({ data }: PercentileHistogramProps) {
  const chartData = data.distribution.map((point) => ({
    percentile: `${point.percentile}th`,
    count: point.count,
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        XP Percentile Distribution
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="percentile" />
          <YAxis />
          <Tooltip
            formatter={(value: number) => formatNumber(value)}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          <Bar dataKey="count" fill="#1DB954" name="User Count" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

