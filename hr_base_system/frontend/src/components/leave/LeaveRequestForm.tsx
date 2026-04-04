import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useLeaveTypes, useCreateLeaveRequest } from '../../lib/api/hooks';
import useFeedback from '../../hooks/useFeedback';
import { getCurrentUserRole } from '../../lib/auth';
import { FormSelect, FormDatePicker, FormInput } from '../forms';

// Validation schema
const leaveRequestSchema = z
  .object({
    leaveTypeId: z.string().min(1, 'Leave type is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

const LeaveRequestForm = () => {
  const { data: leaveTypes, isLoading: isLoadingTypes } = useLeaveTypes();
  const createLeaveRequest = useCreateLeaveRequest();
  const { notifyError, notifySuccess } = useFeedback();
  const userRole = getCurrentUserRole();

  const {
    control,
    handleSubmit,
  formState: { isSubmitting },
    reset,
  } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      reason: '',
    },
  });

  const onSubmit = async (data: LeaveRequestFormData) => {
    try {
      // API expects leaveTypeId as string per LeaveRequestCreateData; backend will parse numeric ID.
      await createLeaveRequest.mutateAsync(data);
      reset();
      notifySuccess('Leave request submitted for approval.');
    } catch (err: unknown) {
      console.error('Failed to submit leave request', err);
      // Extract error message from backend response
      let errorMessage = 'Unable to submit leave request. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errorMessage = response.data.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      notifyError(errorMessage);
    }
  };

  const leaveTypeOptions =
    leaveTypes?.map((type) => ({
      value: type.id.toString(),
      label: type.name,
    })) ?? [];

  let content: React.ReactNode;
  if (isLoadingTypes) {
    content = (
      <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
        <CircularProgress size={40} />
        <Alert severity="info" data-testid="leave-types-loading">Loading leave types...</Alert>
      </Stack>
    );
  } else if (leaveTypeOptions.length === 0) {
    content = (
      <Alert
        severity="warning"
        action={
          (userRole === 'ADMIN' || userRole === 'OWNER') && (
            <Button
              component={RouterLink}
              to="/admin/leave-types"
              color="inherit"
              size="small"
              data-testid="leave-types-setup-btn"
            >
              Set Up Now
            </Button>
          )
        }
        data-testid="no-leave-types-alert"
      >
        <strong>No leave types configured</strong>
        <br />
        Leave types need to be set up before you can request time off. Please contact your HR
        administrator to configure leave types (Annual Leave, Sick Leave, etc.).
      </Alert>
    );
  } else {
    content = (
      <Stack
        component="form"
        spacing={3}
        onSubmit={handleSubmit(onSubmit)}
        data-testid="leave-request-form-fields"
      >
        {createLeaveRequest.error && (
          <Alert severity="error" data-testid="leave-submit-error">Failed to submit request.</Alert>
        )}

        <div data-testid="leave-type-select-wrapper">
          <FormSelect
            name="leaveTypeId"
            control={control}
            label="Leave type"
            options={leaveTypeOptions}
            data-testid="leave-type-select"
          />
        </div>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} data-testid="leave-dates-wrapper">
          <FormDatePicker
            name="startDate"
            control={control}
            label="Start date"
            data-testid="leave-start-date"
          />
          <FormDatePicker
            name="endDate"
            control={control}
            label="End date"
            data-testid="leave-end-date"
          />
        </Stack>

        <FormInput
          name="reason"
          control={control}
          label="Reason (optional)"
          multiline
          rows={3}
          placeholder="Provide a reason for your leave request..."
          data-testid="leave-reason"
        />

        <Stack direction="row" justifyContent="flex-end" data-testid="leave-submit-wrapper">
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            data-testid="leave-submit-btn"
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Submit request'}
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Card data-testid="leave-request-form">
      <CardHeader
        title="Request time off"
        subheader="Submit a new leave request for manager review"
      />
      <CardContent>{content}</CardContent>
    </Card>
  );
};

export default LeaveRequestForm;
