import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';
import { formatDate } from '@/utils/formatters';

interface TimeSeriesDataPoint {
  date: string;
  [key: string]: string | number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title: string;
  lines: {
    dataKey: string;
    name: string;
    color: string;
  }[];
}

export function TimeSeriesChart({ data, title, lines }: TimeSeriesChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    date: formatDate(new Date(point.date), 'MMM d'),
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip labelStyle={{ color: '#000' }} />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, r: 4 }}
              activeDot={{ r: 6 }}
              name={line.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

