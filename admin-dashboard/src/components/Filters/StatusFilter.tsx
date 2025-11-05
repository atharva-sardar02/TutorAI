import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}

export function StatusFilter({ value, onChange, options, label = 'Status' }: StatusFilterProps) {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={handleChange}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

