import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ label, value, color = 'primary.main' }: StatCardProps) {
  return (
    <Card sx={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color, mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

