import React from 'react';
import { Box, Typography } from '@mui/material';
import { Inbox } from '@mui/icons-material';

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ message = 'No data available', icon }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        gap: 2,
      }}
    >
      {icon || <Inbox sx={{ fontSize: 48, color: 'text.disabled' }} />}
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

