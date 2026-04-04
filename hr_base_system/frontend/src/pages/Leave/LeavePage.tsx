
import React, { useState } from 'react';
import { Box, Stack, Typography, Button, Paper, LinearProgress, Chip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import LeaveTypeList from '../../components/leave/LeaveTypeList';
import LeaveRequestList from '../../components/leave/LeaveRequestList';
import LeaveCalendar from '../../components/leave/LeaveCalendar';
import RequestLeaveModal from '../../components/leave/RequestLeaveModal';
import { useSelfLeaveBalance } from '../../lib/api/hooks';
import type { SelfLeaveBalance } from '../../lib/api/leave';

const BALANCE_COLORS = ['primary', 'warning', 'success', 'info', 'error'] as const;

const LeaveBalanceBar = () => {
  const theme = useTheme();
  const { data: balances } = useSelfLeaveBalance();

  if (!balances || balances.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
        My Leave Balances
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={2}>
        {balances.map((b: SelfLeaveBalance, i: number) => {
          const total = b.accrued + b.carriedForward;
          const remaining = total - b.used;
          const pct = total > 0 ? Math.min((b.used / total) * 100, 100) : 0;
          const colorKey = BALANCE_COLORS[i % BALANCE_COLORS.length];
          return (
            <Box key={b.leaveTypeId} sx={{ minWidth: 160, flex: '1 1 160px', maxWidth: 220 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {b.leaveTypeName}
                </Typography>
                <Chip
                  label={`${remaining} left`}
                  size="small"
                  color={colorKey}
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={pct}
                color={colorKey}
                sx={{ height: 5, borderRadius: 3, bgcolor: theme.palette.grey[200] }}
              />
              <Typography variant="caption" color="text.disabled">
                {b.used}/{total} used
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

const LeavePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Leave Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review allocations, manage approvals, and keep teams informed about time away.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
        >
          Request Leave
        </Button>
      </Box>

      <LeaveBalanceBar />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 360px) minmax(0, 1fr)',
          },
          alignItems: 'flex-start',
        }}
      >
        <LeaveTypeList />
        <Box>
          <LeaveCalendar />
        </Box>
      </Box>

      <LeaveRequestList />

      <RequestLeaveModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(data) => {
          console.log('Submitted:', data);
          setIsModalOpen(false);
        }}
      />
    </Stack>
  );
};

export default LeavePage;
