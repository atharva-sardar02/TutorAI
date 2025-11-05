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
  Checkbox,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';
import { CheckCircle, Cancel, Warning } from '@mui/icons-material';
import type { FraudItem } from '@/types/fraud';
import { formatDate } from '@/utils/formatters';

interface FraudQueueTableProps {
  items: FraudItem[];
  selectedIds: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function FraudQueueTable({
  items,
  selectedIds,
  onSelectItem,
  onSelectAll,
  onApprove,
  onReject,
}: FraudQueueTableProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  const getScoreColor = (score: number): 'error' | 'warning' | 'success' => {
    if (score >= 0.7) return 'error';
    if (score >= 0.5) return 'warning';
    return 'success';
  };

  const getStatusColor = (status: string): 'default' | 'success' | 'error' => {
    if (status === 'approved') return 'success';
    if (status === 'rejected') return 'error';
    return 'default';
  };

  if (items.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No fraud items found.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onSelectAll}
              />
            </TableCell>
            <TableCell>Referral ID</TableCell>
            <TableCell>Loop Type</TableCell>
            <TableCell>Score</TableCell>
            <TableCell>Reasons</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              hover
              selected={selectedIds.includes(item.id)}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedIds.includes(item.id)}
                  onChange={() => onSelectItem(item.id)}
                  disabled={item.status !== 'pending'}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {item.referralId.slice(0, 8)}...
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={item.loopType} size="small" />
              </TableCell>
              <TableCell>
                <Chip
                  label={`${(item.anomalyScore * 100).toFixed(0)}%`}
                  size="small"
                  color={getScoreColor(item.anomalyScore)}
                  icon={<Warning />}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {item.reasons.slice(0, 2).map((reason, idx) => (
                    <Chip
                      key={idx}
                      label={reason}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                  {item.reasons.length > 2 && (
                    <Tooltip title={item.reasons.join(', ')}>
                      <Chip
                        label={`+${item.reasons.length - 2}`}
                        size="small"
                        variant="outlined"
                      />
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={item.status}
                  size="small"
                  color={getStatusColor(item.status)}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDate(item.createdAt.toDate())}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {item.status === 'pending' && (
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Tooltip title="Approve">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => onApprove(item.id)}
                      >
                        <CheckCircle />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reject">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onReject(item.id)}
                      >
                        <Cancel />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

