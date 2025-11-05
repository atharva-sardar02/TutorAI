import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';
import { formatPercentage } from '@/utils/formatters';
import type { RetentionMetrics } from '@/types/metrics';

interface RetentionChartProps {
  data: RetentionMetrics;
}

export function RetentionChart({ data }: RetentionChartProps) {
  const chartData = data.overallRetention.map((point) => ({
    day: `Day ${point.day}`,
    retentionRate: point.avgRetentionRate,
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Retention Curve
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis domain={[0, 100]} />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(1)}%`}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="retentionRate"
            stroke="#1DB954"
            strokeWidth={2}
            dot={{ fill: '#1DB954', r: 4 }}
            activeDot={{ r: 6 }}
            name="Retention Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

