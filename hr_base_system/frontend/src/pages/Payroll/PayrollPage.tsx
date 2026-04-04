import React, { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import CalculateIcon from '@mui/icons-material/Calculate';
import DashboardIcon from '@mui/icons-material/Dashboard';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useGeneratePayslip } from '../../lib/api/hooks';
import { getErrorMessage } from '../../lib/apiClient';
import useFeedback from '../../hooks/useFeedback';

const monthOptions = [
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

const formatAmount = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const Payroll = () => {
  const today = useMemo(() => new Date(), []);
  const { notifyError, notifySuccess } = useFeedback();

  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState<string>(
    () => String(today.getMonth() + 1)
  );
  const [year, setYear] = useState<string>(() => String(today.getFullYear()));

  const generateMutation = useGeneratePayslip();
  const {
    data: payslip,
    isPending: isSubmitting,
    error: mutationError,
    variables: context,
    mutate: generatePayslip,
    reset
  } = generateMutation;

  const handleGeneratePayslip = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    reset();

    const parsedEmployeeId = Number(employeeId);
    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    if (Number.isNaN(parsedEmployeeId) || parsedEmployeeId <= 0) {
      notifyError('Please provide a valid employee ID.');
      return;
    }

    if (Number.isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      notifyError('Month must be between 1 and 12.');
      return;
    }

    if (Number.isNaN(parsedYear) || parsedYear < 2000) {
      notifyError('Please enter a valid year.');
      return;
    }

    generatePayslip(
      { employeeId: parsedEmployeeId, month: parsedMonth, year: parsedYear },
      {
        onSuccess: () => {
          notifySuccess('Payslip generated successfully.');
        },
        onError: (err) => {
          notifyError(getErrorMessage(err));
        }
      }
    );
  };

  const metrics = useMemo(
    () =>
      payslip
        ? [
          { label: 'Gross pay', value: payslip.gross_pay },
          { label: 'EPF (employee)', value: payslip.epf_employee },
          { label: 'EPF (employer)', value: payslip.epf_employer },
          { label: 'ETF', value: payslip.etf },
          { label: 'PAYE', value: payslip.paye },
          {
            label: 'Net pay',
            value: payslip.net_pay,
            highlight: true,
          },
        ]
        : [],
    [payslip]
  );

  const contextSummary = useMemo(() => {
    if (!context || !payslip) {
      return '';
    }

    const monthName = monthOptions[context.month - 1];
    return `${monthName} ${context.year} • Employee #${context.employeeId}`;
  }, [context, payslip]);

  const error = mutationError ? getErrorMessage(mutationError) : null;

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Payroll
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate individual payslips with statutory calculations
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/payroll/dashboard"
          startIcon={<DashboardIcon />}
          variant="outlined"
        >
          View dashboard
        </Button>
      </Stack>

      <Card component="form" onSubmit={handleGeneratePayslip}>
        <CardHeader
          title="Generate payslip"
          subheader="Calculate all statutory deductions and take-home pay in one click."
        />
        <CardContent>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Employee ID"
              type="number"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              fullWidth
              required
              disabled={isSubmitting}
              slotProps={{ input: { inputProps: { min: 1 } } }}
              helperText="Use the numeric identifier from the employee directory."
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Month"
                select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                fullWidth
                required
                disabled={isSubmitting}
              >
                {monthOptions.map((label, index) => (
                  <MenuItem key={label} value={String(index + 1)}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Year"
                type="number"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                fullWidth
                required
                disabled={isSubmitting}
                slotProps={{ input: { inputProps: { min: 2000 } } }}
                helperText="Use the payroll period year."
              />
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              spacing={1.5}
            >
              <Button
                type="submit"
                variant="contained"
                startIcon={<CalculateIcon />}
                disabled={isSubmitting}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {isSubmitting ? 'Generating…' : 'Generate payslip'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {payslip && context && (
        <Card>
          <CardHeader title="Payslip summary" subheader={contextSummary} />
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Keep this summary for payroll records and share the final payslip
                with the employee.
              </Typography>

              <Divider />

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: 'repeat(auto-fit, minmax(180px, 1fr))',
                  },
                }}
              >
                {metrics.map((metric) => (
                  <Box
                    key={metric.label}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: metric.highlight
                        ? 'success.main'
                        : 'divider',
                      backgroundColor: metric.highlight
                        ? 'success.light'
                        : 'background.paper',
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    <Typography
                      variant="overline"
                      color={metric.highlight ? 'success.dark' : 'text.secondary'}
                      sx={{ letterSpacing: 0.5 }}
                    >
                      {metric.label}
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={metric.highlight ? 700 : 600}
                      color={metric.highlight ? 'success.dark' : 'text.primary'}
                    >
                      {formatAmount(metric.value)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};

export default Payroll;