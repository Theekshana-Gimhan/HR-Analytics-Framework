import React, { useState, useMemo } from 'react';
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
  TextField,
  CircularProgress,
  Alert,
  TablePagination,
  Tooltip,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { useAuditLogs } from '../../lib/api/hooks';
import type { AuditLogListParams, AuditLogEntry } from '../../lib/api/audit';

const PAGE_SIZES = [25, 50, 100];

const ACTION_CATEGORIES: Record<string, string[]> = {
  Leave: [
    'LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED',
    'LEAVE_TYPE_CREATED', 'LEAVE_TYPE_UPDATED', 'LEAVE_TYPE_DELETED',
  ],
  Payroll: ['PAYROLL_RUN', 'PAYSLIP_GENERATED', 'BANK_FILE_EXPORTED'],
  Employee: [
    'EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_DELETED',
    'EMPLOYEE_DOCUMENT_UPLOADED', 'EMPLOYEE_DOCUMENT_DELETED',
  ],
  Roster: [
    'SHIFT_TEMPLATE_CREATED', 'SHIFT_TEMPLATE_UPDATED', 'SHIFT_TEMPLATE_DELETED',
    'SHIFT_ASSIGNED',
  ],
  Auth: ['USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET'],
  Admin: ['PROFILE_UPDATED'],
};

const ALL_ACTIONS = Object.values(ACTION_CATEGORIES).flat();

const getActionColor = (action: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  if (action.includes('CREATED') || action.includes('APPROVED') || action.includes('LOGIN')) return 'success';
  if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('LOGOUT')) return 'error';
  if (action.includes('UPDATED') || action.includes('CHANGED') || action.includes('RESET')) return 'warning';
  if (action.includes('RUN') || action.includes('GENERATED') || action.includes('EXPORTED')) return 'info';
  return 'default';
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatAction = (action: string): string =>
  action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const AuditLogPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params: AuditLogListParams = useMemo(() => ({
    limit: rowsPerPage,
    offset: page * rowsPerPage,
    ...(actionFilter && { action: actionFilter }),
    ...(entityTypeFilter && { entityType: entityTypeFilter }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  }), [page, rowsPerPage, actionFilter, entityTypeFilter, startDate, endDate]);

  const { data, isLoading, error } = useAuditLogs(params);

  const entityTypes = useMemo(() => {
    const types = new Set<string>();
    data?.logs?.forEach((log: AuditLogEntry) => types.add(log.entityType));
    return Array.from(types).sort();
  }, [data]);

  const handlePageChange = (_: unknown, newPage: number) => setPage(newPage);
  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <HistoryIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>Audit Logs</Typography>
      </Stack>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={actionFilter}
                label="Action"
                onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All Actions</MenuItem>
                {Object.entries(ACTION_CATEGORIES).map(([category, actions]) => [
                  <MenuItem key={`cat-${category}`} disabled sx={{ fontWeight: 700, opacity: 1, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' }}>
                    {category}
                  </MenuItem>,
                  ...actions.map((a) => (
                    <MenuItem key={a} value={a} sx={{ pl: 3 }}>
                      {formatAction(a)}
                    </MenuItem>
                  )),
                ])}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={entityTypeFilter}
                label="Entity Type"
                onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All Types</MenuItem>
                {entityTypes.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="From"
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              label="To"
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load audit logs. {error instanceof Error ? error.message : ''}
        </Alert>
      )}

      {data && !isLoading && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Entity</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>User ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No audit logs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.logs.map((log: AuditLogEntry) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatAction(log.action)}
                          size="small"
                          color={getActionColor(log.action)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{log.entityType}</Typography>
                        {log.entityId && (
                          <Typography variant="caption" color="text.secondary">
                            #{log.entityId}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{log.userId}</TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        {log.details ? (
                          <Tooltip title={JSON.stringify(log.details, null, 2)} arrow>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>
                              {JSON.stringify(log.details)}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={data.total}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={PAGE_SIZES}
          />
        </>
      )}
    </Box>
  );
};

export default AuditLogPage;
