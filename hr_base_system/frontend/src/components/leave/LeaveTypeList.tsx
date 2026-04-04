import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { getCurrentUserRole } from '../../lib/auth';
import { useLeaveTypes, useCurrentUser, useLeaveBalance } from '../../lib/api/hooks';

const LeaveTypeList = () => {
  const { data: leaveTypes, isLoading, error } = useLeaveTypes();
  const { data: currentUser } = useCurrentUser();
  const userRole = getCurrentUserRole();
  
  // Fetch leave balance for current user if they have an employeeId
  const employeeId = currentUser?.employeeId;
  const { data: leaveBalances, isLoading: isLoadingBalances } = useLeaveBalance(
    employeeId ?? '',
    !!employeeId
  );
  
  // Create a map of leave type ID to balance for quick lookup
  const balanceMap = React.useMemo(() => {
    if (!leaveBalances) return new Map();
    return new Map(leaveBalances.map((b) => [b.leaveTypeId, b]));
  }, [leaveBalances]);

  return (
    <Card>
      <CardHeader
        title="Leave allowance"
        subheader="Track balances and keep teams informed"
        action={
          (userRole === 'ADMIN' || userRole === 'OWNER') && (
            <Button
              component={RouterLink}
              to="/admin/leave-types"
              startIcon={<SettingsIcon />}
              size="small"
            >
              Manage
            </Button>
          )
        }
      />
      <Divider />
      <CardContent>
        {error && <Alert severity="error">Unable to load leave types right now.</Alert>}

        {isLoading ? (
          <Stack spacing={2}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} variant="rounded" height={48} />
            ))}
          </Stack>
        ) : leaveTypes?.length === 0 ? (
          <Alert 
            severity="info"
            action={
              (userRole === 'ADMIN' || userRole === 'OWNER') && (
                <Button
                  component={RouterLink}
                  to="/admin/leave-types"
                  color="inherit"
                  size="small"
                >
                  Set Up Now
                </Button>
              )
            }
          >
            <strong>No leave types configured</strong>
            <br />
            Leave types (Annual, Sick, Casual, etc.) need to be set up by your system administrator
            before employees can request time off.
          </Alert>
        ) : (
          <List disablePadding>
            {leaveTypes?.map((leaveType) => {
              const balance = balanceMap.get(Number(leaveType.id));
              const available = balance?.available ?? 0;
              const used = balance?.used ?? 0;
              const total = available + used;
              const progressValue = total > 0 ? (available / total) * 100 : 0;
              
              return (
                <ListItem
                  key={leaveType.id}
                  sx={{
                    px: 0,
                    py: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 1,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={leaveType.name} color="primary" size="small" />
                    {employeeId && !isLoadingBalances && balance && (
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {available.toFixed(1)} days available
                      </Typography>
                    )}
                  </Stack>
                  
                  {employeeId && !isLoadingBalances && balance && (
                    <Box sx={{ width: '100%' }}>
                      <LinearProgress
                        variant="determinate"
                        value={progressValue}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            backgroundColor: progressValue > 30 ? 'success.main' : 'warning.main',
                          },
                        }}
                      />
                      <Stack direction="row" justifyContent="space-between" mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Used: {used.toFixed(1)} days
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total: {total.toFixed(1)} days
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                  
                  {employeeId && isLoadingBalances && (
                    <Skeleton variant="rounded" height={24} width="100%" />
                  )}
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveTypeList;
