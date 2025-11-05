import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Switch,
  Chip,
  Alert,
  Snackbar,
  FormControlLabel,
} from '@mui/material';
import { Warning, CheckCircle } from '@mui/icons-material';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { ConfirmDialog } from '@/components/Common/ConfirmDialog';
import { useKillSwitches, useToggleKillSwitch } from '@/hooks/useKillSwitches';
import { useAuth } from '@/hooks/useAuth';
import type { KillSwitch } from '@/types/system';

export function KillSwitches() {
  const { user } = useAuth();
  const { data: killSwitches, isLoading, isError, error } = useKillSwitches();
  const toggleSwitch = useToggleKillSwitch();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    switch: KillSwitch | null;
    newState: boolean;
  }>({
    open: false,
    switch: null,
    newState: false,
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

  const handleToggleClick = (killSwitch: KillSwitch, newState: boolean) => {
    setConfirmDialog({
      open: true,
      switch: killSwitch,
      newState,
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmDialog.switch) return;

    try {
      await toggleSwitch.mutateAsync({
        switchId: confirmDialog.switch.id,
        enabled: confirmDialog.newState,
        adminId: user?.uid || 'unknown',
      });

      setSnackbar({
        open: true,
        message: `${confirmDialog.switch.name} ${confirmDialog.newState ? 'enabled' : 'disabled'} successfully.`,
        severity: 'success',
      });

      setConfirmDialog({ open: false, switch: null, newState: false });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error',
      });
      setConfirmDialog({ open: false, switch: null, newState: false });
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={error?.message || 'Failed to load kill switches.'} />;
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'system': return 'error';
      case 'loop': return 'success';
      default: return 'primary';
    }
  };

  // Group by category
  const groupedSwitches = {
    feature: killSwitches?.filter(s => s.category === 'feature') || [],
    loop: killSwitches?.filter(s => s.category === 'loop') || [],
    system: killSwitches?.filter(s => s.category === 'system') || [],
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Kill Switches
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage feature flags and system controls
        </Typography>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>Warning:</strong> Disabling critical features may impact user experience. Always verify before toggling.
      </Alert>

      {/* System Switches */}
      {groupedSwitches.system.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            System Controls
          </Typography>
          <Grid container spacing={2}>
            {groupedSwitches.system.map((killSwitch) => (
              <Grid item xs={12} md={6} key={killSwitch.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {killSwitch.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {killSwitch.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={killSwitch.category}
                            size="small"
                            color={getCategoryColor(killSwitch.category) as any}
                          />
                          <Chip
                            label={`${killSwitch.impact} impact`}
                            size="small"
                            color={getImpactColor(killSwitch.impact) as any}
                          />
                        </Box>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={killSwitch.enabled}
                            onChange={(e) => handleToggleClick(killSwitch, e.target.checked)}
                            color="primary"
                          />
                        }
                        label={killSwitch.enabled ? 'ON' : 'OFF'}
                        labelPlacement="start"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Loop Switches */}
      {groupedSwitches.loop.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            Viral Loops
          </Typography>
          <Grid container spacing={2}>
            {groupedSwitches.loop.map((killSwitch) => (
              <Grid item xs={12} md={6} key={killSwitch.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {killSwitch.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {killSwitch.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={killSwitch.category}
                            size="small"
                            color={getCategoryColor(killSwitch.category) as any}
                          />
                          <Chip
                            label={`${killSwitch.impact} impact`}
                            size="small"
                            color={getImpactColor(killSwitch.impact) as any}
                          />
                        </Box>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={killSwitch.enabled}
                            onChange={(e) => handleToggleClick(killSwitch, e.target.checked)}
                            color="primary"
                          />
                        }
                        label={killSwitch.enabled ? 'ON' : 'OFF'}
                        labelPlacement="start"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Feature Switches */}
      {groupedSwitches.feature.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Features
          </Typography>
          <Grid container spacing={2}>
            {groupedSwitches.feature.map((killSwitch) => (
              <Grid item xs={12} md={6} key={killSwitch.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {killSwitch.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {killSwitch.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={killSwitch.category}
                            size="small"
                            color={getCategoryColor(killSwitch.category) as any}
                          />
                          <Chip
                            label={`${killSwitch.impact} impact`}
                            size="small"
                            color={getImpactColor(killSwitch.impact) as any}
                          />
                        </Box>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={killSwitch.enabled}
                            onChange={(e) => handleToggleClick(killSwitch, e.target.checked)}
                            color="primary"
                          />
                        }
                        label={killSwitch.enabled ? 'ON' : 'OFF'}
                        labelPlacement="start"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={`${confirmDialog.newState ? 'Enable' : 'Disable'} ${confirmDialog.switch?.name}`}
        message={`Are you sure you want to ${confirmDialog.newState ? 'enable' : 'disable'} this feature? ${
          confirmDialog.switch?.impact === 'critical' || confirmDialog.switch?.impact === 'high'
            ? 'This may significantly impact user experience.'
            : ''
        }`}
        confirmText={confirmDialog.newState ? 'Enable' : 'Disable'}
        confirmColor={confirmDialog.newState ? 'primary' : 'warning'}
        onConfirm={handleConfirmToggle}
        onCancel={() => setConfirmDialog({ open: false, switch: null, newState: false })}
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

