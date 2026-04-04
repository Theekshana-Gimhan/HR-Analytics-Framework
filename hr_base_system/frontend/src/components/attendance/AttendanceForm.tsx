import React from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Card, CardContent, CardHeader, Stack, CircularProgress } from '@mui/material';
import { FormInput, FormDatePicker, FormSelect } from '../forms';
import { useCreateAttendance } from '../../lib/api/hooks';
import useFeedback from '../../hooks/useFeedback';

const attendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').refine((val) => !isNaN(Number(val)) && Number(val) > 0, { message: 'Must be a positive number' }),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'WFH', 'ON_LEAVE']),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

interface AttendanceFormProps {
  onSuccess?: () => void;
  prefillEmployeeId?: string;
}

const AttendanceForm = ({ onSuccess, prefillEmployeeId }: AttendanceFormProps) => {
  const { notifyError, notifySuccess } = useFeedback();
  const createAttendance = useCreateAttendance();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { isSubmitting }, reset } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      employeeId: '',
      date: new Date().toISOString().slice(0, 10),
      status: 'PRESENT',
    },
  });

  const onSubmit = async (data: AttendanceFormData) => {
    try {
      setFormError(null);
      await createAttendance.mutateAsync({
        employeeId: data.employeeId,
        date: data.date,
        status: data.status,
      });
      reset({
        employeeId: '',
        date: new Date().toISOString().slice(0, 10),
        status: 'PRESENT',
      });
      notifySuccess('Attendance recorded successfully.');
      onSuccess?.();
    } catch (err: unknown) {
      console.error('Failed to submit attendance', err);
      // Extract error message from API response
      const errorMessage = err instanceof Error 
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || err.message
        : 'Unable to save attendance. Please try again.';
      setFormError(errorMessage);
      notifyError(errorMessage);
    }
  };

  // Autofill employeeId when selected from table
  useEffect(() => {
    if (prefillEmployeeId) {
      reset((current) => ({
        ...current,
        employeeId: prefillEmployeeId,
      }));
      setFormError(null);
    }
  }, [prefillEmployeeId, reset]);

  return (
    <Card>
      <CardHeader
        title="Mark attendance"
        subheader="Track daily presence for individual team members"
      />
      <CardContent>
        <Stack component="form" spacing={3} onSubmit={handleSubmit(onSubmit)}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormInput
            name="employeeId"
            control={control}
            label="Employee ID"
            type="number"
            helperText="Use the numeric ID from the employee directory."
          />

          <FormDatePicker
            name="date"
            control={control}
            label="Date"
          />

          <FormSelect
            name="status"
            control={control}
            label="Status"
            options={[
              { value: 'PRESENT', label: 'Present' },
              { value: 'ABSENT', label: 'Absent' },
              { value: 'LATE', label: 'Late' },
              { value: 'HALF_DAY', label: 'Half Day' },
              { value: 'WFH', label: 'Work From Home' },
              { value: 'ON_LEAVE', label: 'On Leave' },
            ]}
          />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Save attendance'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AttendanceForm;
