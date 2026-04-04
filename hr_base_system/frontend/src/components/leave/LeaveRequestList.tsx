import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  useLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from '../../lib/api/hooks';
import useFeedback from '../../hooks/useFeedback';
import { LeaveRequest, LeaveRequestStatus } from '../../lib/api';

const LeaveRequestList = () => {
  const {
    data: leaveRequests,
    isLoading,
    error,
  } = useLeaveRequests({ status: 'PENDING' });

  const approveRequest = useApproveLeaveRequest();
  const rejectRequest = useRejectLeaveRequest();
  const { notifyError, notifySuccess } = useFeedback();

  const handleApprove = async (id: string) => {
    try {
      await approveRequest.mutateAsync({ id });
      notifySuccess('Leave request approved.');
    } catch (err: unknown) {
      console.error('Failed to approve leave request', err);
      // Extract error message from backend response
      let errorMessage = 'Could not approve leave request.';
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

  const handleReject = async (id: string) => {
    try {
      await rejectRequest.mutateAsync({ id });
      notifySuccess('Leave request rejected.');
    } catch (err: unknown) {
      console.error('Failed to reject leave request', err);
      // Extract error message from backend response
      let errorMessage = 'Could not reject leave request.';
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

  const statusColor: Record<LeaveRequestStatus, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'error',
    CANCELLED: 'default',
  };

  const isUpdating = approveRequest.isPending || rejectRequest.isPending;

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
      >
        <Typography variant="h5" fontWeight={600}>
          Team requests
        </Typography>
        {!isLoading && (
          <Chip
            label={`${leaveRequests?.length ?? 0} pending requests`}
            color="primary"
            variant="outlined"
          />
        )}
      </Stack>

      {error && <Alert severity="error">Unable to fetch leave requests.</Alert>}

      {isLoading && (
        <Stack alignItems="center" py={4}>
          <CircularProgress />
        </Stack>
      )}

      {!isLoading && (!leaveRequests || leaveRequests.length === 0) && (
        <Card>
          <CardContent>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              No pending leave requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              When employees request time off, you&apos;ll be able to approve or reject their submissions here.
            </Typography>
          </CardContent>
        </Card>
      )}

      {!isLoading && leaveRequests && leaveRequests.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
            },
          }}
        >
          {leaveRequests.map((request: LeaveRequest) => (
            <Card key={request.id}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" fontWeight={600}>
                      Employee #{request.employeeId ?? 'N/A'}
                    </Typography>
                    <Chip
                      label={request.status}
                      color={statusColor[request.status]}
                      size="small"
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(
                      (request as unknown as { start_date?: string; startDate?: string }).start_date ??
                      (request as unknown as { start_date?: string; startDate?: string }).startDate ??
                      ''
                    ).toLocaleDateString()}{' '}
                    →{' '}
                    {new Date(
                      (request as unknown as { end_date?: string; endDate?: string }).end_date ??
                      (request as unknown as { end_date?: string; endDate?: string }).endDate ??
                      ''
                    ).toLocaleDateString()}
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                  >
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      disabled={isUpdating}
                      onClick={() => handleApprove(request.id.toString())}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      {approveRequest.isPending && approveRequest.variables?.id === request.id.toString() ? <CircularProgress size={20} /> : 'Approve'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      disabled={isUpdating}
                      onClick={() => handleReject(request.id.toString())}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      {rejectRequest.isPending && rejectRequest.variables?.id === request.id.toString() ? <CircularProgress size={20} /> : 'Reject'}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Stack>
  );
};

export default LeaveRequestList;
