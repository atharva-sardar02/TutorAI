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
  Switch,
  Box,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, TrendingUp } from '@mui/icons-material';
import type { Experiment } from '@/types/experiments';
import { formatDate } from '@/utils/formatters';

interface ExperimentTableProps {
  experiments: Experiment[];
  onToggle: (experimentId: string, active: boolean) => void;
}

function ExperimentRow({ experiment, onToggle }: { experiment: Experiment; onToggle: (id: string, active: boolean) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {experiment.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {experiment.description}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={experiment.active ? 'Active' : 'Inactive'}
            size="small"
            color={experiment.active ? 'success' : 'default'}
          />
        </TableCell>
        <TableCell>
          {experiment.variants.length} variants
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {experiment.targetAudience.roles?.map((role) => (
              <Chip key={role} label={role} size="small" variant="outlined" />
            ))}
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {formatDate(experiment.startDate.toDate())}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Tooltip title={experiment.active ? 'Deactivate' : 'Activate'}>
            <Switch
              checked={experiment.active}
              onChange={(e) => onToggle(experiment.id, e.target.checked)}
              color="primary"
            />
          </Tooltip>
        </TableCell>
      </TableRow>

      {/* Expandable variant details */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Variants
              </Typography>
              <Table size="small" aria-label="variants">
                <TableHead>
                  <TableRow>
                    <TableCell>Variant</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Weight</TableCell>
                    <TableCell>Config</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {experiment.variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell>{variant.name}</TableCell>
                      <TableCell>{variant.description}</TableCell>
                      <TableCell>
                        <Chip label={`${(variant.weight * 100).toFixed(0)}%`} size="small" />
                      </TableCell>
                      <TableCell>
                        {variant.config && (
                          <Typography variant="caption" fontFamily="monospace">
                            {JSON.stringify(variant.config).slice(0, 50)}...
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Typography variant="h6" gutterBottom component="div" sx={{ mt: 2 }}>
                Metrics
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {experiment.metrics.map((metric, idx) => (
                  <Chip
                    key={idx}
                    label={`${metric.name} (${metric.goal})`}
                    size="small"
                    icon={<TrendingUp />}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export function ExperimentTable({ experiments, onToggle }: ExperimentTableProps) {
  if (experiments.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No experiments found.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Variants</TableCell>
            <TableCell>Target</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {experiments.map((experiment) => (
            <ExperimentRow key={experiment.id} experiment={experiment} onToggle={onToggle} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

