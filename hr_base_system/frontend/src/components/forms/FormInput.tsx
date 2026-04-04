import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';

interface FormInputProps<T extends FieldValues> extends Omit<TextFieldProps, 'name'> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules?: Record<string, any>;
}

export function FormInput<T extends FieldValues>({
  name,
  control,
  label,
  rules,
  ...textFieldProps
}: FormInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...textFieldProps}
          label={label}
          error={!!error}
          helperText={error?.message}
          fullWidth
          variant="outlined"
        />
      )}
    />
  );
}
