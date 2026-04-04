import React, { useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useLeaveRequests } from '../../lib/api/hooks';
import { LeaveRequest } from '../../lib/api';

const LeaveCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const {
    data: leaves,
    isLoading,
    error,
  } = useLeaveRequests({
    status: 'APPROVED',
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
  });

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const handlePreviousMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate.toDateString() === endDate.toDateString()) {
      return startDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    }

    return `${startDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })} - ${endDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })}`;
  };

  const getEmployeeName = (leave: LeaveRequest) => {
    if (leave.employee) {
      return `${leave.employee.first_name} ${leave.employee.last_name}`;
    }
    return `Employee #${leave.employeeId}`;
  };

  return (
    <Card>
      <CardHeader
        title="Leave calendar"
        subheader="Company-wide view of approved time off"
        action={
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={handlePreviousMonth} size="small" aria-label="Previous month">
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120, textAlign: 'center' }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Typography>
            <IconButton onClick={handleNextMonth} size="small" aria-label="Next month">
              <ChevronRightIcon />
            </IconButton>
          </Stack>
        }
      />
      <CardContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>Unable to load leave calendar.</Alert>}

        {isLoading && (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={32} />
          </Stack>
        )}

        {!isLoading && (!leaves || leaves.length === 0) && (
          <Box py={4} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No approved leaves for this month.
            </Typography>
          </Box>
        )}

        {!isLoading && leaves && leaves.length > 0 && (
          <List disablePadding>
            {leaves.map((leave: LeaveRequest) => (
              <ListItem
                key={leave.id}
                sx={{
                  borderLeft: 3,
                  borderColor: 'primary.main',
                  mb: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="body1" fontWeight={600}>
                        {getEmployeeName(leave)}
                      </Typography>
                      {(leave.leaveType || leave.leave_type) && (
                        <Chip label={(leave.leaveType || leave.leave_type)?.name} size="small" color="primary" />
                      )}
                    </Stack>
                  }
                  secondary={formatDateRange(
                    (leave as unknown as { start_date?: string; startDate?: string }).start_date ??
                    (leave as unknown as { start_date?: string; startDate?: string }).startDate ??
                    '',
                    (leave as unknown as { end_date?: string; endDate?: string }).end_date ??
                    (leave as unknown as { end_date?: string; endDate?: string }).endDate ??
                    ''
                  )}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveCalendar;
