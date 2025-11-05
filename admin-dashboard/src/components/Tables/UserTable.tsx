import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
} from '@mui/material';
import { Visibility, Block, CheckCircle, Download } from '@mui/icons-material';
import type { UserProfile } from '@/types/user';
import { formatDate, formatNumber } from '@/utils/formatters';

interface UserTableProps {
  users: UserProfile[];
  onViewProfile: (userId: string) => void;
  onBan: (userId: string) => void;
  onUnban: (userId: string) => void;
}

export function UserTable({ users, onViewProfile, onBan, onUnban }: UserTableProps) {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const handleViewProfile = (user: UserProfile) => {
    setSelectedUser(user);
  };

  const handleCloseDialog = () => {
    setSelectedUser(null);
  };

  if (users.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No users found.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Stats</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {user.displayName || 'No name'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    size="small"
                    color={user.role === 'tutor' ? 'primary' : 'secondary'}
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="caption" display="block">
                      XP: {user.stats ? formatNumber(user.stats.xpBalance) : 0}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {user.stats ? user.stats.totalSessions : 0} sessions
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {user.banned ? (
                    <Chip label="Banned" size="small" color="error" />
                  ) : (
                    <Chip label="Active" size="small" color="success" />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {formatDate(user.createdAt.toDate())}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Tooltip title="View Profile">
                      <IconButton
                        size="small"
                        onClick={() => handleViewProfile(user)}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {user.banned ? (
                      <Tooltip title="Unban User">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => onUnban(user.uid)}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Ban User">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onBan(user.uid)}
                        >
                          <Block fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Profile Dialog */}
      <Dialog
        open={!!selectedUser}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedUser && (
          <>
            <DialogTitle>
              User Profile: {selectedUser.displayName || selectedUser.email}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body2">{selectedUser.email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    UID
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {selectedUser.uid}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Role
                  </Typography>
                  <Chip
                    label={selectedUser.role}
                    size="small"
                    color={selectedUser.role === 'tutor' ? 'primary' : 'secondary'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  {selectedUser.banned ? (
                    <Chip label="Banned" size="small" color="error" />
                  ) : (
                    <Chip label="Active" size="small" color="success" />
                  )}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Joined
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selectedUser.createdAt.toDate())}
                  </Typography>
                </Grid>
                {selectedUser.lastActive && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Last Active
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(selectedUser.lastActive.toDate())}
                    </Typography>
                  </Grid>
                )}
                {selectedUser.stats && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                        Statistics
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        XP Balance
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(selectedUser.stats.xpBalance)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Sessions
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(selectedUser.stats.totalSessions)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Messages
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(selectedUser.stats.totalMessages)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Referrals
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(selectedUser.stats.totalReferrals)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Monthly XP
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(selectedUser.stats.monthlyXp)}
                      </Typography>
                    </Grid>
                    {selectedUser.stats.monthlyPercentile >= 0 && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Percentile
                        </Typography>
                        <Typography variant="h6">
                          Top {100 - selectedUser.stats.monthlyPercentile}%
                        </Typography>
                      </Grid>
                    )}
                  </>
                )}
                {selectedUser.banned && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" sx={{ mt: 2, mb: 1 }} color="error">
                        Ban Information
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Reason
                      </Typography>
                      <Typography variant="body2">
                        {selectedUser.banReason || 'No reason provided'}
                      </Typography>
                    </Grid>
                    {selectedUser.bannedAt && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Banned At
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(selectedUser.bannedAt.toDate())}
                        </Typography>
                      </Grid>
                    )}
                    {selectedUser.bannedBy && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Banned By
                        </Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {selectedUser.bannedBy.slice(0, 8)}...
                        </Typography>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}

