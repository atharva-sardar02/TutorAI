import React from 'react';
import { Box, Button, ButtonGroup } from '@mui/material';
import { subDays } from 'date-fns';
import type { DateRange } from '@/types/metrics';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presets = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const handlePresetClick = (days: number) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    onChange({ startDate, endDate });
  };

  const isActive = (days: number) => {
    const daysDiff = Math.floor((value.endDate.getTime() - value.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff === days;
  };

  return (
    <Box>
      <ButtonGroup size="small" variant="outlined">
        {presets.map(({ label, days }) => (
          <Button
            key={days}
            onClick={() => handlePresetClick(days)}
            variant={isActive(days) ? 'contained' : 'outlined'}
          >
            {label}
          </Button>
        ))}
      </ButtonGroup>
    </Box>
  );
}

