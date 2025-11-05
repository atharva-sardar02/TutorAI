import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { LoopType } from '@/types/metrics';

interface LoopTypeFilterProps {
  value: LoopType;
  onChange: (loopType: LoopType) => void;
}

const loopTypes: { value: LoopType; label: string }[] = [
  { value: 'all', label: 'All Loops' },
  { value: 'referral', label: 'Referrals' },
  { value: 'challenge', label: 'Challenges' },
  { value: 'parent_pod', label: 'Parent Pods' },
  { value: 'tutor_peer', label: 'Tutor Peers' },
];

export function LoopTypeFilter({ value, onChange }: LoopTypeFilterProps) {
  return (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <InputLabel>Loop Type</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as LoopType)}
        label="Loop Type"
      >
        {loopTypes.map(({ value, label }) => (
          <MenuItem key={value} value={value}>
            {label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

