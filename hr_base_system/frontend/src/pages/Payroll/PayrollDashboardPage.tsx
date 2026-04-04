import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { usePayrollStatistics, usePayslips, useRunPayroll, useCurrentUser } from '../../lib/api/hooks';
import { payrollApi, Payslip as ApiPayslip } from '../../lib/api';
import useFeedback from '../../hooks/useFeedback';

// Extended Payslip type that handles both camelCase and snake_case API responses
type Payslip = ApiPayslip & {
  employee?: {
    first_name: string;
    last_name: string;
  };
  // snake_case variants for backwards compatibility
  gross_pay?: number;
  epf_employee?: number;
  epf_employer?: number;
  net_pay?: number;
  created_at?: string;
};

const PayrollDashboard = () => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [isRunConfirmOpen, setIsRunConfirmOpen] = useState(false);
  const { notifyError, notifySuccess } = useFeedback();

  // Get current user role
  const { data: currentUser } = useCurrentUser();
  const isEmployee = currentUser?.role === 'EMPLOYEE';
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'OWNER';

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = usePayrollStatistics(currentMonth, currentYear, isAdmin);

  const {
    data: payslips,
    isLoading: payslipsLoading,
    error: payslipsError,
    refetch: refetchPayslips,
  } = usePayslips({ month: currentMonth, year: currentYear });

  const runPayroll = useRunPayroll();

  const isLoading = statsLoading || payslipsLoading;
  const error = statsError || payslipsError;

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
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleRunPayroll = async () => {
    try {
      await runPayroll.mutateAsync({ month: currentMonth, year: currentYear });
      notifySuccess('Payroll run completed successfully!');
      refetchStats();
      refetchPayslips();
    } catch (err) {
      console.error('Failed to run payroll', err);
      notifyError('Payroll run failed. Please check the logs.');
    } finally {
      setIsRunConfirmOpen(false);
    }
  };

  const handleDownloadPayslip = async (payslipId: string) => {
    try {
      const response = await payrollApi.downloadPayslipPdf(payslipId);

      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${payslipId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notifySuccess('Payslip downloaded successfully');
    } catch (err) {
      console.error('Failed to download payslip', err);
      notifyError('Unable to download payslip');
    }
  };

  const handleDownloadBankFile = async () => {
    try {
      const response = await payrollApi.downloadBankFile(currentMonth, currentYear);

      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bank_transfer_${currentYear}_${currentMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notifySuccess('Bank file downloaded successfully');
    } catch (err) {
      console.error('Failed to download bank file', err);
      notifyError('Unable to download bank file');
    }
  };

  const formatCurrency = (value: number | undefined) =>
    value
      ? value.toLocaleString('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
      })
      : 'LKR 0.00';

  const getEmployeeName = (payslip: Payslip) => {
    if (payslip.employee) {
      return `${payslip.employee.first_name} ${payslip.employee.last_name}`;
    }
    return `Employee #${payslip.employeeId}`;
  };

  return (
    <>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {isEmployee ? 'My Payslips' : 'Payroll dashboard'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEmployee
                ? 'View and download your payslip history'
                : 'Monthly summary, statutory reports, and payslip history'}
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={handlePreviousMonth} size="small" aria-label="Previous month">
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120, textAlign: 'center' }}>
              {monthNames[currentMonth - 1]} {currentYear}
            </Typography>
            <IconButton onClick={handleNextMonth} size="small" aria-label="Next month">
              <ChevronRightIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                if (isAdmin) refetchStats();
                refetchPayslips();
              }}
              size="small"
              aria-label="Refresh"
            >
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>

        {error && <Alert severity="error">Unable to load payroll data.</Alert>}

        {isLoading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : (
          <>
            {/* Monthly Summary Stats - Admin only */}
            {isAdmin && stats && (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(4, minmax(0, 1fr))',
                  },
                }}
              >
                <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <Typography variant="overline">Employees</Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.employeeCount}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                  <Typography variant="overline">Gross payroll</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {formatCurrency(stats.totalGrossPay)}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
                  <Typography variant="overline">Net payroll</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {formatCurrency(stats.totalNetPay)}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, bgcolor: 'warning.light' }}>
                  <Typography variant="overline">Total PAYE</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {formatCurrency(stats.totalPaye)}
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* Statutory Contributions - Admin only */}
            {isAdmin && stats && (
              <Card>
                <CardHeader
                  title="Statutory contributions"
                  subheader="EPF and ETF totals for government filing"
                />
                <Divider />
                <CardContent>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 3,
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: 'repeat(3, minmax(0, 1fr))',
                      },
                    }}
                  >
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        EPF Employee (8%)
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {formatCurrency(stats.totalEpfEmployee)}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        EPF Employer (12%)
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {formatCurrency(stats.totalEpfEmployer)}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        ETF (3%)
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {formatCurrency(stats.totalEtf)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Run Payroll Card - Admin only */}
            {isAdmin && (
              <Card>
                <CardHeader
                  title="Run new payroll"
                  subheader="Calculate and generate payslips for the selected month"
                />
                <Divider />
                <CardContent>
                  <Button
                    variant="contained"
                    startIcon={<PlayCircleOutlineIcon />}
                    onClick={() => setIsRunConfirmOpen(true)}
                    disabled={(payslips?.length ?? 0) > 0 || runPayroll.isPending}
                  >
                    Run payroll for {monthNames[currentMonth - 1]}
                  </Button>
                  {(payslips?.length ?? 0) > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      Payroll has already been run for this month.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bank File Download - Admin only */}
            {isAdmin && (
              <Card>
                <CardHeader
                  title="Bank transfer file"
                  subheader="Generate CIPS/SLIPS format for salary disbursement"
                />
                <Divider />
                <CardContent>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadBankFile}
                    disabled={(payslips?.length ?? 0) === 0}
                  >
                    Download bank file
                  </Button>
                  {(payslips?.length ?? 0) === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      No payslips generated for this month.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payslip History Table */}
            <Card>
              <CardHeader
                title={isEmployee ? 'My payslip history' : 'Payslip history'}
                subheader={`${payslips?.length ?? 0} payslip${(payslips?.length ?? 0) !== 1 ? 's' : ''} ${isEmployee ? 'available' : 'generated this month'}`}
              />
              <Divider />
              <CardContent>
                {(payslips?.length ?? 0) === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {isEmployee ? 'No payslips available for this period' : 'No payslips generated for this period'}
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          {isAdmin && <TableCell>Employee</TableCell>}
                          <TableCell>Period</TableCell>
                          <TableCell align="right">Gross pay</TableCell>
                          <TableCell align="right">Deductions</TableCell>
                          <TableCell align="right">Net pay</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payslips?.map((payslip: Payslip) => {
                          const totalDeductions =
                            Number(payslip.epfEmployee ?? (payslip as { epf_employee?: number }).epf_employee ?? 0) + Number(payslip.paye ?? 0);
                          return (
                            <TableRow key={payslip.id} hover>
                              {isAdmin && <TableCell>{getEmployeeName(payslip)}</TableCell>}
                              <TableCell>{monthNames[payslip.month - 1]} {payslip.year}</TableCell>
                              <TableCell align="right">
                                {formatCurrency(payslip.grossPay ?? (payslip as { gross_pay?: number }).gross_pay ?? 0)}
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(totalDeductions)}
                              </TableCell>
                              <TableCell align="right">
                                <Typography fontWeight={600}>
                                  {formatCurrency(payslip.netPay ?? (payslip as { net_pay?: number }).net_pay ?? 0)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadPayslip(payslip.id.toString())}
                                  aria-label="Download payslip"
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Stack>

      <Dialog open={isRunConfirmOpen} onClose={() => setIsRunConfirmOpen(false)}>
        <DialogTitle>Confirm Payroll Run</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to run the payroll for {monthNames[currentMonth - 1]} {currentYear}? This action cannot be undone.
          </DialogContentText>
          {runPayroll.isPending && (
            <Stack alignItems="center" mt={2}>
              <CircularProgress />
              <Typography variant="caption" mt={1}>Processing...</Typography>
            </Stack>
          )}
          {runPayroll.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              An error occurred during the payroll run.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRunConfirmOpen(false)} disabled={runPayroll.isPending}>
            Cancel
          </Button>
          <Button onClick={handleRunPayroll} variant="contained" color="primary" disabled={runPayroll.isPending}>
            Confirm & Run
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PayrollDashboard;

