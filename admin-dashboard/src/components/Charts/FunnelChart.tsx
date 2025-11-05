import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Box, Typography } from '@mui/material';
import { formatNumber, formatDecimalAsPercentage } from '@/utils/formatters';
import type { FunnelMetrics } from '@/types/metrics';

interface FunnelChartProps {
  data: FunnelMetrics;
}

const COLORS = ['#1DB954', '#1ed760', '#17a34a', '#15803d', '#14532d'];

export function FunnelChart({ data }: FunnelChartProps) {
  const chartData = data.stages.map((stage, index) => ({
    name: stage.stage,
    count: stage.count,
    conversionRate: stage.conversionRate,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Conversion Funnel
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={150} />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'count' ? formatNumber(value) : `${value.toFixed(1)}%`
            }
            labelStyle={{ color: '#000' }}
          />
          <Bar dataKey="count" name="Users">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

