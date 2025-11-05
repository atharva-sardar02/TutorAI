import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
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
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

