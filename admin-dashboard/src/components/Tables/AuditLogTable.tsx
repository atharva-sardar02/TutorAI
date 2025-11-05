import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
} from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import type { AuditLogEntry } from '@/types/system';
import { formatDate } from '@/utils/formatters';

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No audit log entries found.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Timestamp</TableCell>
            <TableCell>Admin</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Resource</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} hover>
              <TableCell>
                <Typography variant="body2">
                  {formatDate(entry.timestamp.toDate())}
                </Typography>
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {entry.adminEmail}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entry.adminId.slice(0, 8)}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip label={entry.action} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2">{entry.resource}</Typography>
                  {entry.resourceId && (
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                      {entry.resourceId.slice(0, 12)}...
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                {entry.status === 'success' ? (
                  <Chip
                    icon={<CheckCircle />}
                    label="Success"
                    size="small"
                    color="success"
                  />
                ) : (
                  <Chip
                    icon={<Error />}
                    label="Failed"
                    size="small"
                    color="error"
                  />
                )}
              </TableCell>
              <TableCell>
                {entry.details && (
                  <Typography variant="caption" fontFamily="monospace">
                    {JSON.stringify(entry.details).slice(0, 50)}...
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

