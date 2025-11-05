import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Refresh, Download } from '@mui/icons-material';
import { UserTable } from '@/components/Tables/UserTable';
import { StatusFilter } from '@/components/Filters/StatusFilter';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { useSearchUsers, useBanUser, useUnbanUser } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';
import { exportToCSV } from '@/services/exportService';
import type { UserSearchFilters } from '@/types/user';

export function UserManagement() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<UserSearchFilters>({
    role: 'all',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [banDialog, setBanDialog] = useState<{
    open: boolean;
    userId: string;
    reason: string;
  }>({
    open: false,
    userId: '',
    reason: '',
  });
  const [unbanDialog, setUnbanDialog] = useState<{
    open: boolean;
    userId: string;
  }>({
    open: false,
    userId: '',
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

  const { data: users, isLoading, isError, error, refetch } = useSearchUsers({
    ...filters,
    searchQuery,
  });
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();

  const handleBan = (userId: string) => {
    setBanDialog({ open: true, userId, reason: '' });
  };

  const handleUnban = (userId: string) => {
    setUnbanDialog({ open: true, userId });
  };

  const handleConfirmBan = async () => {
    try {
      await banUser.mutateAsync({
        userId: banDialog.userId,
        reason: banDialog.reason || 'No reason provided',
        adminId: user?.uid || 'unknown',
      });

      setSnackbar({
        open: true,
        message: 'User banned successfully.',
        severity: 'success',
      });

      setBanDialog({ open: false, userId: '', reason: '' });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error',
      });
      setBanDialog({ open: false, userId: '', reason: '' });
    }
  };

  const handleConfirmUnban = async () => {
    try {
      await unbanUser.mutateAsync({
        userId: unbanDialog.userId,
        adminId: user?.uid || 'unknown',
      });

      setSnackbar({
        open: true,
        message: 'User unbanned successfully.',
        severity: 'success',
      });

      setUnbanDialog({ open: false, userId: '' });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error',
      });
      setUnbanDialog({ open: false, userId: '' });
    }
  };

  const handleExport = () => {
    if (!users) return;

    const data = users.map(user => ({
      UID: user.uid,
      Email: user.email,
      DisplayName: user.displayName || '',
      Role: user.role,
      XP: user.stats?.xpBalance || 0,
      Sessions: user.stats?.totalSessions || 0,
      Messages: user.stats?.totalMessages || 0,
      Referrals: user.stats?.totalReferrals || 0,
      Status: user.banned ? 'Banned' : 'Active',
      Joined: user.createdAt.toDate().toISOString(),
    }));

    exportToCSV(data, `users-${Date.now()}.csv`);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={error?.message || 'Failed to load users.'} />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search and manage user accounts
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={!users || users.length === 0}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              placeholder="Email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
              label="Role"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatusFilter
              value={filters.banned === true ? 'banned' : filters.banned === false ? 'active' : 'all'}
              onChange={(value) => 
                setFilters({ 
                  ...filters, 
                  banned: value === 'banned' ? true : value === 'active' ? false : undefined 
                })
              }
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'banned', label: 'Banned' },
              ]}
              label="Status"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* User Table */}
      <UserTable
        users={users || []}
        onViewProfile={(userId) => console.log('View profile:', userId)}
        onBan={handleBan}
        onUnban={handleUnban}
      />

      {/* Results Count */}
      {users && users.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {users.length} users
          </Typography>
        </Box>
      )}

      {/* Ban Dialog */}
      <Dialog open={banDialog.open} onClose={() => setBanDialog({ open: false, userId: '', reason: '' })}>
        <DialogTitle>Ban User</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to ban this user? They will no longer be able to access the app.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="Reason (optional)"
            placeholder="Enter reason for ban..."
            value={banDialog.reason}
            onChange={(e) => setBanDialog({ ...banDialog, reason: e.target.value })}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBanDialog({ open: false, userId: '', reason: '' })}>
            Cancel
          </Button>
          <Button onClick={handleConfirmBan} color="error" variant="contained">
            Ban User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unban Dialog */}
      <Dialog open={unbanDialog.open} onClose={() => setUnbanDialog({ open: false, userId: '' })}>
        <DialogTitle>Unban User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to unban this user? They will regain access to the app.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnbanDialog({ open: false, userId: '' })}>
            Cancel
          </Button>
          <Button onClick={handleConfirmUnban} color="success" variant="contained">
            Unban User
          </Button>
        </DialogActions>
      </Dialog>

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

