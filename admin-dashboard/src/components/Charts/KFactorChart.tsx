import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';
import { formatDate, formatPercentage } from '@/utils/formatters';
import type { KFactorMetrics } from '@/types/metrics';

interface KFactorChartProps {
  data: KFactorMetrics;
}

export function KFactorChart({ data }: KFactorChartProps) {
  const chartData = data.trend.map((point) => ({
    date: formatDate(new Date(point.date), 'MMM d'),
    kFactor: point.kFactor,
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        K-Factor Trend
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            formatter={(value: number) => value.toFixed(2)}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="kFactor"
            stroke="#1DB954"
            strokeWidth={2}
            dot={{ fill: '#1DB954', r: 4 }}
            activeDot={{ r: 6 }}
            name="K-Factor"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

