import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Button,
  Tabs,
  Tab,
  TextField,
  Divider,
  Tooltip,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import AttendanceForm from '../../components/attendance/AttendanceForm';
import AttendanceBulkUpload from '../../components/attendance/AttendanceBulkUpload';
import AttendanceLogTable from '../../components/attendance/AttendanceLogTable';
import CorrectionRequestDialog from '../../components/attendance/CorrectionRequestDialog';
import {
  useMyAttendance,
  useAttendance,
  useDailyLog,
  useCheckIn,
  useCheckOut,
  useMyAttendanceSummary,
  useMyCorrectionRequests,
  useCreateCorrectionRequest,
  useAllCorrectionRequests,
  useUpdateCorrectionRequest,
} from '../../lib/api/hooks';
import { getCurrentUserRole } from '../../lib/auth';
import type { Attendance } from '../../lib/api';
import type { AttendanceCorrectionRequest } from '@simpala/types';

// Simple date formatter
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const AttendancePage = () => {
  const userRole = getCurrentUserRole();
  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

  const [tabValue, setTabValue] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [dailyDate, setDailyDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Sprint 2 — employee state
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [checkInOutMsg, setCheckInOutMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sprint 2 — mutations
  const checkInMutation  = useCheckIn();
  const checkOutMutation = useCheckOut();
  const createCorrectionMutation = useCreateCorrectionRequest();
  const updateCorrectionMutation = useUpdateCorrectionRequest();

  // Sprint 2 — queries
  const { data: summaryData } = useMyAttendanceSummary(selectedMonth, selectedYear, !isAdmin);
  const { data: myCorrectionRequests, refetch: refetchMyCorrections } = useMyCorrectionRequests(!isAdmin);
  const { data: allCorrectionRequests, refetch: refetchAllCorrections } = useAllCorrectionRequests(isAdmin);

  // Compute month-based range as fallback when custom dates are not set
  const monthStr = String(selectedMonth).padStart(2, '0');
  const computedStartDate = `${selectedYear}-${monthStr}-01`;
  const endDay = new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate();
  const computedEndDate = `${selectedYear}-${monthStr}-${String(endDay).padStart(2, '0')}`;

  // Use custom filter dates if provided, otherwise fall back to computed month range
  const startDate = filterStartDate || computedStartDate;
  const endDate = filterEndDate || computedEndDate;

  // Validate reversed range (end before start)
  const reversedRange = Boolean(filterStartDate && filterEndDate && filterStartDate > filterEndDate);

  const {
    data: myAttendance,
    isLoading: isLoadingMy,
    error: errorMy,
    refetch: refetchMy,
  } = useMyAttendance(
    filterStartDate || filterEndDate
      ? { startDate: startDate || undefined, endDate: endDate || undefined }
      : { month: selectedMonth, year: selectedYear },
    !isAdmin || tabValue === 2
  );

  const {
    data: allAttendance,
    isLoading: isLoadingAll,
    error: errorAll,
    refetch: refetchAll,
  } = useAttendance(
    reversedRange
      ? {}
      : { startDate: startDate || undefined, endDate: endDate || undefined },
    isAdmin && tabValue === 1 && !reversedRange
  );

  const {
    data: dailyLog,
    isLoading: isLoadingDaily,
    error: errorDaily,
    refetch: refetchDaily,
  } = useDailyLog(dailyDate, isAdmin && tabValue === 0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    if (isAdmin) {
      if (tabValue === 0) refetchDaily();
      else if (tabValue === 1) refetchAll();
      else refetchMy();
      refetchAllCorrections();
    } else {
      refetchMy();
      refetchMyCorrections();
    }
  };

  // Sprint 2 handlers
  const handleCheckIn = async () => {
    setCheckInOutMsg(null);
    try {
      const result = await checkInMutation.mutateAsync();
      setCheckInOutMsg({ type: 'success', text: result.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to check in.';
      setCheckInOutMsg({ type: 'error', text: msg });
    }
  };

  const handleCheckOut = async () => {
    setCheckInOutMsg(null);
    try {
      const result = await checkOutMutation.mutateAsync();
      setCheckInOutMsg({ type: 'success', text: result.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to check out.';
      setCheckInOutMsg({ type: 'error', text: msg });
    }
  };

  const handleCorrectionSubmit = async (data: Parameters<typeof createCorrectionMutation.mutateAsync>[0]) => {
    await createCorrectionMutation.mutateAsync(data);
  };

  const correctionStatusColor = (status: string) => {
    if (status === 'APPROVED') return 'success' as const;
    if (status === 'REJECTED') return 'error' as const;
    return 'warning' as const;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'success';
      case 'ABSENT':
        return 'error';
      case 'LATE':
        return 'warning';
      case 'HALF_DAY':
        return 'warning';
      case 'WFH':
        return 'info';
      case 'ON_LEAVE':
        return 'info';
      default:
        return 'default';
    }
  };

  const renderAttendanceTable = (records: Attendance[] | undefined, showEmployee = false) => {
    if (!records || records.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No attendance records found for the selected period.
        </Alert>
      );
    }

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {showEmployee && <TableCell>Employee</TableCell>}
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Day type</TableCell>
              <TableCell>Check In</TableCell>
              <TableCell>Check Out</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => {
              const isSelected = showEmployee && selectedEmployeeId === String(record.employeeId);
              return (
                <TableRow
                  key={record.id}
                  hover={showEmployee}
                  onClick={() => {
                    if (showEmployee && record.employeeId) {
                      setSelectedEmployeeId(String(record.employeeId));
                    }
                  }}
                  sx={showEmployee ? { cursor: 'pointer', backgroundColor: isSelected ? 'action.hover' : undefined } : undefined}
                >
                  {showEmployee && (
                    <TableCell>
                      {record.employee
                        ? `${record.employee.first_name} ${record.employee.last_name}`
                        : '-'}
                    </TableCell>
                  )}
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>
                    <Chip
                      label={record.status}
                      color={getStatusColor(record.status) as 'success' | 'error' | 'warning' | 'info' | 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.dayType || 'WEEKDAY'}
                      color={(record.dayType === 'WEEKEND' ? 'warning' : 'default') as 'warning' | 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{record.checkInTime || '-'}</TableCell>
                  <TableCell>{record.checkOutTime || '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const isLoading = isAdmin
    ? (tabValue === 0 ? isLoadingDaily : tabValue === 1 ? isLoadingAll : isLoadingMy)
    : isLoadingMy;

  const error = isAdmin
    ? (tabValue === 0 ? errorDaily : tabValue === 1 ? errorAll : errorMy)
    : errorMy;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Attendance
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isAdmin
            ? 'Manage attendance records, view daily logs, or upload CSV.'
            : 'View your attendance records.'}
        </Typography>
      </Box>

      {/* Admin: Show management forms */}
      {isAdmin && (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(0, 1fr) minmax(0, 1fr)',
            },
            alignItems: 'stretch',
          }}
        >
          <AttendanceForm onSuccess={handleRefresh} prefillEmployeeId={selectedEmployeeId} />
          <AttendanceBulkUpload onSuccess={handleRefresh} />
        </Box>
      )}

      {/* Employee: Check-In / Check-Out widget */}
      {!isAdmin && (
        <>
          {checkInOutMsg && (
            <Alert severity={checkInOutMsg.type} onClose={() => setCheckInOutMsg(null)}>
              {checkInOutMsg.text}
            </Alert>
          )}

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Attendance
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={checkInMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
                  onClick={handleCheckIn}
                  disabled={checkInMutation.isPending || checkOutMutation.isPending}
                  sx={{ minWidth: 140 }}
                >
                  Check In
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  size="large"
                  startIcon={checkOutMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <LogoutIcon />}
                  onClick={handleCheckOut}
                  disabled={checkInMutation.isPending || checkOutMutation.isPending}
                  sx={{ minWidth: 140 }}
                >
                  Check Out
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Monthly Summary Card */}
          {summaryData && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {(
                    [
                      { key: 'PRESENT', label: 'Present', color: 'success.main' },
                      { key: 'ABSENT',  label: 'Absent',  color: 'error.main'   },
                      { key: 'LATE',    label: 'Late',    color: 'warning.main' },
                      { key: 'HALF_DAY',label: 'Half Day',color: 'warning.light'},
                      { key: 'WFH',     label: 'WFH',     color: 'info.main'    },
                      { key: 'ON_LEAVE',label: 'On Leave',color: 'info.light'   },
                    ] as const
                  ).map(({ key, label, color }) => (
                    <Box
                      key={key}
                      sx={{
                        textAlign: 'center',
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'background.default',
                        border: '1px solid',
                        borderColor: 'divider',
                        minWidth: 90,
                        flex: '1 1 90px',
                      }}
                    >
                      <Typography variant="h4" fontWeight={700} sx={{ color }}>
                        {summaryData.summary[key]}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Correction Requests */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Attendance Corrections
                </Typography>
                <Button variant="outlined" size="small" onClick={() => setCorrectionDialogOpen(true)}>
                  Request Correction
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {!myCorrectionRequests || myCorrectionRequests.length === 0 ? (
                <Alert severity="info">No correction requests submitted yet.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Requested Status</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Admin Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(myCorrectionRequests as AttendanceCorrectionRequest[]).map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>{new Date(req.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip label={req.requestedStatus} size="small" />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>
                            <Tooltip title={req.reason}>
                              <Typography noWrap variant="body2">{req.reason}</Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={req.status}
                              color={correctionStatusColor(req.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{req.adminNotes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <CorrectionRequestDialog
            open={correctionDialogOpen}
            onClose={() => setCorrectionDialogOpen(false)}
            onSubmit={handleCorrectionSubmit}
          />
        </>
      )}

      {/* Admin: Correction requests management */}
      {isAdmin && allCorrectionRequests && allCorrectionRequests.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Correction Requests
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Requested Status</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(allCorrectionRequests as AttendanceCorrectionRequest[]).map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        {req.employee
                          ? `${req.employee.first_name} ${req.employee.last_name}`
                          : `#${req.employeeId}`}
                      </TableCell>
                      <TableCell>{new Date(req.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip label={req.requestedStatus} size="small" />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Tooltip title={req.reason}>
                          <Typography noWrap variant="body2">{req.reason}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={req.status}
                          color={correctionStatusColor(req.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {req.status === 'PENDING' && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled={updateCorrectionMutation.isPending}
                              onClick={() =>
                                updateCorrectionMutation.mutate({ id: req.id, data: { status: 'APPROVED' } })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={updateCorrectionMutation.isPending}
                              onClick={() =>
                                updateCorrectionMutation.mutate({ id: req.id, data: { status: 'REJECTED' } })
                              }
                            >
                              Reject
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Attendance Records */}
      <Card>
        <CardContent>
          {isAdmin ? (
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tab label="Daily Log" />
              <Tab label="All Attendance" />
              <Tab label="My Attendance" />
            </Tabs>
          ) : (
            <Typography variant="h6" gutterBottom>
              My Attendance Records
            </Typography>
          )}

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Daily Log Date Picker */}
            {isAdmin && tabValue === 0 && (
              <TextField
                label="Select Date"
                type="date"
                size="small"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 170 }}
              />
            )}

            {/* Range Filters for other tabs */}
            {(!isAdmin || tabValue !== 0) && (
              <>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    label="Month"
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {months.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={selectedYear}
                    label="Year"
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Start date"
                  type="date"
                  size="small"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 170 }}
                  error={reversedRange}
                />
                <TextField
                  label="End date"
                  type="date"
                  size="small"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 170 }}
                  error={reversedRange}
                />
                {(filterStartDate || filterEndDate) && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                    }}
                  >
                    Clear dates
                  </Button>
                )}
              </>
            )}

            <Button variant="outlined" size="small" onClick={handleRefresh}>
              Refresh
            </Button>
          </Box>

          {reversedRange && (!isAdmin || tabValue !== 0) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              End date is before start date. Please correct the range.
            </Alert>
          )}

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to load records. {(error as { message?: string }).message || 'Please try again.'}
            </Alert>
          )}

          {!isLoading && !error && (
            <>
              {isAdmin ? (
                <>
                  <TabPanel value={tabValue} index={0}>
                    <AttendanceLogTable data={dailyLog} />
                  </TabPanel>
                  <TabPanel value={tabValue} index={1}>
                    {renderAttendanceTable(allAttendance?.data, true)}
                  </TabPanel>
                  <TabPanel value={tabValue} index={2}>
                    {renderAttendanceTable(myAttendance, false)}
                  </TabPanel>
                </>
              ) : (
                renderAttendanceTable(myAttendance, false)
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

export default AttendancePage;
