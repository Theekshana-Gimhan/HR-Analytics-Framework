
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useDashboardStats } from '../../lib/api/hooks';
import LiquidityWidget from '../../components/dashboard/LiquidityWidget';
import MyLeavesWidget from '../../components/dashboard/MyLeavesWidget';
import RequestLeaveModal from '../../components/leave/RequestLeaveModal';

const Dashboard = () => {
  const { data: stats, isLoading, error } = useDashboardStats();
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Unable to load dashboard statistics. Please try again later.</Alert>;
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your HR system at a glance
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
          gap: 3,
        }}
      >
        <Card
          sx={{
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h3" fontWeight={700}>
                  {stats?.totalEmployees ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Employees
                </Typography>
              </Box>
              <PeopleIcon sx={{ fontSize: 48, opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            height: '100%',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h3" fontWeight={700}>
                  {stats?.activeEmployees ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Active Employees
                </Typography>
              </Box>
              <AccessTimeIcon sx={{ fontSize: 48, opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            height: '100%',
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h3" fontWeight={700}>
                  {stats?.pendingLeaves ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Pending Approvals
                </Typography>
              </Box>
              <EventNoteIcon sx={{ fontSize: 48, opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            height: '100%',
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white',
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h3" fontWeight={700}>
                  {Array.isArray(stats?.upcomingLeaves) ? stats.upcomingLeaves.length : (stats?.upcomingLeaves ?? 0)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Upcoming Leaves (30 days)
                </Typography>
              </Box>
              <EventNoteIcon sx={{ fontSize: 48, opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>

        <LiquidityWidget />
      </Box>

      {/* New Widgets Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 3
        }}
      >
        <MyLeavesWidget onApplyLeave={() => setIsLeaveModalOpen(true)} />
        {/* Placeholder for future widget (e.g. Attendance Graph) */}
      </Box>

      {/* Quick Actions */}
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Quick Actions
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
            mt: 1,
          }}
        >
          <Button
            component={RouterLink}
            to="/employees"
            variant="outlined"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            sx={{ py: 2 }}
          >
            Manage Employees
          </Button>
          <Button
            component={RouterLink}
            to="/leave"
            variant="outlined"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            sx={{ py: 2 }}
          >
            Leave Management
          </Button>
          <Button
            component={RouterLink}
            to="/attendance"
            variant="outlined"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            sx={{ py: 2 }}
          >
            Track Attendance
          </Button>
          <Button
            component={RouterLink}
            to="/payroll"
            variant="outlined"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            sx={{ py: 2 }}
          >
            Payroll Dashboard
          </Button>
        </Box>
      </Box>

      {/* Recent Activity / Pending Items */}
      {stats && stats.pendingLeaves > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Action Required
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            You have {stats.pendingLeaves} pending leave request
            {stats.pendingLeaves > 1 ? 's' : ''} awaiting approval.{' '}
            <Button
              component={RouterLink}
              to="/leave"
              size="small"
              sx={{ ml: 1 }}
            >
              Review Now
            </Button>
          </Alert>
        </Paper>
      )}

      {/* Global Leave Modal */}
      <RequestLeaveModal
        open={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSubmit={(data) => {
          console.log('Leave Request:', data);
          setIsLeaveModalOpen(false);
        }}
      />
    </Stack>
  );
};

export default Dashboard;
