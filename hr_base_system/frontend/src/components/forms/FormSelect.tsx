import React from 'react';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  type SelectProps,
} from '@mui/material';
interface FormSelectProps<T extends FieldValues> extends Omit<SelectProps, 'name'> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Array<{ value: string | number; label: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules?: Record<string, any>;
}

export function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  rules,
  ...selectProps
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <FormControl fullWidth error={!!error} variant="outlined">
          <InputLabel id={`${name}-label`}>{label}</InputLabel>
          <Select {...field} {...selectProps} labelId={`${name}-label`} label={label}>
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {error && <FormHelperText>{error.message}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}
