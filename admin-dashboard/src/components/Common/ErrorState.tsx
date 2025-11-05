import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
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
      <ErrorOutline sx={{ fontSize: 48, color: 'error.main' }} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry} size="small">
          Retry
        </Button>
      )}
    </Box>
  );
}

