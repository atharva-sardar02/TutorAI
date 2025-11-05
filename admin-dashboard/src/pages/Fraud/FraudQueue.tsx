import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Alert,
  Snackbar,
} from '@mui/material';
import { CheckCircle, Cancel, Refresh } from '@mui/icons-material';
import { FraudQueueTable } from '@/components/Tables/FraudQueueTable';
import { StatusFilter } from '@/components/Filters/StatusFilter';
import { LoopTypeFilter } from '@/components/Filters/LoopTypeFilter';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { ConfirmDialog } from '@/components/Common/ConfirmDialog';
import { useFraudQueue, useFraudAction } from '@/hooks/useFraudQueue';
import { useAuth } from '@/hooks/useAuth';
import type { FraudQueueFilters } from '@/types/fraud';

export function FraudQueue() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FraudQueueFilters>({
    status: 'pending',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    itemIds: string[];
  }>({
    open: false,
    action: 'approve',
    itemIds: [],
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

  const { data: fraudItems, isLoading, isError, error, refetch } = useFraudQueue(filters);
  const fraudAction = useFraudAction();

  const handleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === fraudItems?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(fraudItems?.filter(item => item.status === 'pending').map((item) => item.id) || []);
    }
  };

  const openConfirmDialog = (action: 'approve' | 'reject', itemIds: string[]) => {
    setConfirmDialog({ open: true, action, itemIds });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, action: 'approve', itemIds: [] });
  };

  const handleAction = async () => {
    try {
      await fraudAction.mutateAsync({
        action: confirmDialog.action,
        itemIds: confirmDialog.itemIds,
        adminId: user?.uid || 'unknown',
      });

      setSnackbar({
        open: true,
        message: `${confirmDialog.itemIds.length} item(s) ${confirmDialog.action === 'approve' ? 'approved' : 'rejected'} successfully.`,
        severity: 'success',
      });

      setSelectedIds([]);
      closeConfirmDialog();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error',
      });
      closeConfirmDialog();
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={error?.message || 'Failed to load fraud queue.'} />;
  }

  const pendingCount = fraudItems?.filter((item) => item.status === 'pending').length || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Fraud Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and manage suspicious referrals
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Box>

      {/* Summary Alert */}
      {pendingCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>{pendingCount}</strong> pending item(s) require review.
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <StatusFilter
              value={filters.status || 'pending'}
              onChange={(value) => setFilters({ ...filters, status: value as any })}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <LoopTypeFilter
              value={filters.loopType || 'all'}
              onChange={(value) => setFilters({ ...filters, loopType: value === 'all' ? undefined : value })}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Batch Actions */}
      {selectedIds.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2">
            {selectedIds.length} item(s) selected
          </Typography>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<CheckCircle />}
            onClick={() => openConfirmDialog('approve', selectedIds)}
          >
            Approve Selected
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<Cancel />}
            onClick={() => openConfirmDialog('reject', selectedIds)}
          >
            Reject Selected
          </Button>
        </Paper>
      )}

      {/* Fraud Queue Table */}
      <FraudQueueTable
        items={fraudItems || []}
        selectedIds={selectedIds}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        onApprove={(id) => openConfirmDialog('approve', [id])}
        onReject={(id) => openConfirmDialog('reject', [id])}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={`${confirmDialog.action === 'approve' ? 'Approve' : 'Reject'} Referral(s)`}
        message={`Are you sure you want to ${confirmDialog.action} ${confirmDialog.itemIds.length} referral(s)? This action will update the fraud queue and may affect reward payouts.`}
        confirmText={confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
        confirmColor={confirmDialog.action === 'approve' ? 'success' : 'error'}
        onConfirm={handleAction}
        onCancel={closeConfirmDialog}
      />

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

