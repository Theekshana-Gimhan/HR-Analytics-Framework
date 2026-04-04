

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Stack, CircularProgress } from '@mui/material';
import { FormInput, FormSelect, FormDatePicker } from '../forms';
import { useCreateEmployee, useUpdateEmployee } from '../../lib/api/hooks';
import useFeedback from '../../hooks/useFeedback';

type EmployeeFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: EmployeeFormData;
  employeeId?: string;
};

const employeeSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name must contain only letters'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name must contain only letters'),
  email: z.string()
    .email('Invalid email address')
    .min(5, 'Email is required'),
  nic: z.string()
    .min(9, 'NIC must be at least 9 characters')
    .max(12, 'NIC must not exceed 12 characters')
    .regex(/^([0-9]{9}[vVxX]|[0-9]{12})$/, 'Invalid NIC format (e.g., 991234567V or 199912345678)'),
  phone: z.string()
    .regex(/^[0-9+\-\s()]{10,15}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z.string()
    .min(1, 'Date of birth is required')
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      return age >= 16 && age <= 100;
    }, { message: 'Employee must be between 16 and 100 years old' }),
  gender: z.enum(['Male', 'Female', 'Other']),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  jobTitle: z.string().min(2, 'Job title is required'),
  department: z.string().min(2, 'Department is required'),
  joinDate: z.string()
    .min(1, 'Join date is required')
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      return date <= today;
    }, { message: 'Join date cannot be in the future' }),
  basicSalary: z.string()
    .min(1, 'Basic salary is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 10000 && Number(val) <= 10000000, {
      message: 'Basic salary must be between LKR 10,000 and LKR 10,000,000'
    }),
  allowances: z.string()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Allowances must be a positive number'
    })
    .optional()
    .or(z.literal('')),
  bankName: z.string().min(1, 'Bank name is required'),
  bankBranch: z.string().min(1, 'Bank branch is required'),
  accountNumber: z.string()
    .regex(/^[0-9]{10,20}$/, 'Account number must be 10-20 digits'),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

const EmployeeForm: React.FC<EmployeeFormProps> = ({ onSuccess, onCancel, initialData, employeeId }) => {
  const { control, handleSubmit, formState: { isSubmitting }, reset } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      email: '',
      nic: '',
      phone: '',
      dateOfBirth: '',
      gender: 'Male',
      address: '',
      jobTitle: '',
      department: '',
      joinDate: '',
      basicSalary: '',
      allowances: '',
      bankName: '',
      bankBranch: '',
      accountNumber: '',
      accountHolderName: '',
    },
  });

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const { notifySuccess, notifyError } = useFeedback();

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      // Map camelCase form fields to snake_case API fields (backend expects snake_case)
      const apiPayload = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        nic: data.nic,
        phone: data.phone || undefined,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        address: data.address || undefined,
        job_title: data.jobTitle,
        department: data.department,
        join_date: data.joinDate,
        basic_salary: Number(data.basicSalary),
        allowances: data.allowances ? Number(data.allowances) : 0,
        bank_name: data.bankName || undefined,
        bank_branch: data.bankBranch || undefined,
        account_number: data.accountNumber || undefined,
        account_holder_name: data.accountHolderName || undefined,
      };

      if (employeeId) {
        await updateEmployee.mutateAsync({ id: employeeId, data: apiPayload });
        notifySuccess('Employee updated successfully!');
      } else {
        await createEmployee.mutateAsync(apiPayload);
        notifySuccess('Employee created successfully!');
      }

      reset();
      onSuccess();
    } catch (err) {
      console.error('Failed to save employee', err);
      notifyError('Failed to save employee. Please check the details and try again.');
    }
  };

  return (
    <Stack
      component="form"
      spacing={3}
      onSubmit={handleSubmit(onSubmit)}
      sx={{ mt: 1 }}
    >
      {createEmployee.error && <Alert severity="error">An unexpected error occurred.</Alert>}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
          },
        }}
      >
        <FormInput name="firstName" control={control} label="First Name" />
        <FormInput name="lastName" control={control} label="Last Name" />
        <FormInput name="email" control={control} label="Work Email" type="email" />
        <FormInput name="nic" control={control} label="NIC Number" />
        <FormInput name="phone" control={control} label="Phone Number" />
        <FormDatePicker name="dateOfBirth" control={control} label="Date of Birth" />
        <FormSelect
          name="gender"
          control={control}
          label="Gender"
          options={[
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
            { value: 'Other', label: 'Other' },
          ]}
        />
        <FormInput name="address" control={control} label="Address" sx={{ gridColumn: { sm: 'span 2' } }} />
        <FormInput name="jobTitle" control={control} label="Job Title" />
        <FormInput name="department" control={control} label="Department" />
        <FormDatePicker name="joinDate" control={control} label="Join Date" />
        <FormInput name="basicSalary" control={control} label="Basic Salary (LKR)" type="number" />
        <FormInput name="allowances" control={control} label="Allowances (LKR)" type="number" />
        <FormInput name="bankName" control={control} label="Bank Name" />
        <FormInput name="bankBranch" control={control} label="Bank Branch" />
        <FormInput name="accountNumber" control={control} label="Account Number" />
        <FormInput name="accountHolderName" control={control} label="Account Holder Name" sx={{ gridColumn: { sm: 'span 2' } }} />
      </Box>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button onClick={onCancel} color="inherit" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : (employeeId ? 'Update Employee' : 'Create Employee')}
        </Button>
      </Stack>
    </Stack>
  );
};

export default EmployeeForm;
