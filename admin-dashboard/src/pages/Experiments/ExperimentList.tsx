import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  Snackbar,
} from '@mui/material';
import { ExperimentTable } from '@/components/Tables/ExperimentTable';
import { StatusFilter } from '@/components/Filters/StatusFilter';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { useExperiments, useToggleExperiment } from '@/hooks/useExperiments';
import { useAuth } from '@/hooks/useAuth';
import type { ExperimentFilters } from '@/types/experiments';

export function ExperimentList() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ExperimentFilters>({
    status: 'all',
    role: 'all',
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: experiments, isLoading, isError, error } = useExperiments(filters);
  const toggleExperiment = useToggleExperiment();

  const handleToggle = async (experimentId: string, active: boolean) => {
    try {
      await toggleExperiment.mutateAsync({
        experimentId,
        active,
        adminId: user?.uid || 'unknown',
      });

      setSnackbar({
        open: true,
        message: `Experiment ${active ? 'activated' : 'deactivated'} successfully.`,
        severity: 'success',
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error',
      });
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={error?.message || 'Failed to load experiments.'} />;
  }

  const activeCount = experiments?.filter((exp) => exp.active).length || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Experiments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage A/B tests and feature experiments
        </Typography>
      </Box>

      {/* Summary Alert */}
      {activeCount > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>{activeCount}</strong> active experiment(s) currently running.
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <StatusFilter
              value={filters.status || 'all'}
              onChange={(value) => setFilters({ ...filters, status: value as any })}
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              label="Status"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatusFilter
              value={filters.role || 'all'}
              onChange={(value) => setFilters({ ...filters, role: value as any })}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'tutor', label: 'Tutors' },
                { value: 'parent', label: 'Parents' },
              ]}
              label="Target Role"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Experiment Table */}
      <ExperimentTable experiments={experiments || []} onToggle={handleToggle} />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

