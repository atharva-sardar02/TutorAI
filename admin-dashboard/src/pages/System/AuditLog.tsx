import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
} from '@mui/material';
import { Download, Refresh } from '@mui/icons-material';
import { AuditLogTable } from '@/components/Tables/AuditLogTable';
import { StatusFilter } from '@/components/Filters/StatusFilter';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { useAuditLog } from '@/hooks/useAuditLog';
import { exportToCSV } from '@/services/exportService';
import type { AuditLogFilters } from '@/types/system';

export function AuditLog() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    status: 'all',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const { data: auditEntries, isLoading, isError, error, refetch } = useAuditLog(filters);

  const handleExport = () => {
    if (!auditEntries) return;

    const data = auditEntries.map(entry => ({
      Timestamp: entry.timestamp.toDate().toISOString(),
      Admin: entry.adminEmail,
      AdminID: entry.adminId,
      Action: entry.action,
      Resource: entry.resource,
      ResourceID: entry.resourceId || '',
      Status: entry.status,
      Details: entry.details ? JSON.stringify(entry.details) : '',
      IPAddress: entry.ipAddress || '',
    }));

    exportToCSV(data, `audit-log-${Date.now()}.csv`);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={error?.message || 'Failed to load audit log.'} />;
  }

  // Filter entries by search query
  const filteredEntries = auditEntries?.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.adminEmail.toLowerCase().includes(query) ||
      entry.action.toLowerCase().includes(query) ||
      entry.resource.toLowerCase().includes(query) ||
      (entry.resourceId && entry.resourceId.toLowerCase().includes(query))
    );
  }) || [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Audit Log
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track admin actions and system events
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
            disabled={!auditEntries || auditEntries.length === 0}
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
              placeholder="Email, action, resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatusFilter
              value={filters.status || 'all'}
              onChange={(value) => setFilters({ ...filters, status: value as any })}
              options={[
                { value: 'all', label: 'All' },
                { value: 'success', label: 'Success' },
                { value: 'failed', label: 'Failed' },
              ]}
              label="Status"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Audit Log Table */}
      <AuditLogTable entries={filteredEntries} />

      {/* Results Count */}
      {filteredEntries.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredEntries.length} of {auditEntries?.length || 0} entries
          </Typography>
        </Box>
      )}
    </Box>
  );
}

