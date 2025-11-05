import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export function MetricCard({ title, value, icon, trend, subtitle }: MetricCardProps) {
  return (
    <Card sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        </Box>

        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          {value}
        </Typography>

        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}

        {trend && (
          <Chip
            icon={trend.isPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
            label={`${trend.isPositive ? '+' : ''}${trend.value}%`}
            size="small"
            color={trend.isPositive ? 'success' : 'error'}
            sx={{ mt: 1 }}
          />
        )}
      </CardContent>
    </Card>
  );
}

