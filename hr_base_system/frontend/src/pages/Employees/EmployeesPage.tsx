import React, { useState, useEffect, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useTheme } from '@mui/material/styles';
import EmployeeForm from '../../components/employee/EmployeeForm';
import { useEmployees } from '../../lib/api/hooks';
import { Employee } from '../../lib/api';

const EmployeeList = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error, refetch, isFetching } = useEmployees({
    search: debouncedSearch,
    page,
    limit: 10,
  });

  const employees = data?.data ?? [];
  const pagination = data;

  // Filter employees on client side (for demo - ideally done on backend)
  const filteredEmployees = useMemo(() => {
    let filtered = [...employees];

    if (departmentFilter) {
      filtered = filtered.filter(emp =>
        emp.job_title?.toLowerCase().includes(departmentFilter.toLowerCase())
      );
    }

    // Note: Status filtering removed as Employee type doesn't include termination date

    return filtered;
  }, [employees, departmentFilter]);

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    setSuccessMessage('Employee created successfully.');
    // The useCreateEmployee hook will invalidate the query, so no need to refetch manually
  };

  const hasActiveFilters = departmentFilter || statusFilter || debouncedSearch;

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setDepartmentFilter('');
    setStatusFilter('');
    setPage(1);
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        flexWrap="wrap"
        rowGap={2}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Employees
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your workforce, review profiles, and keep contact details up to date.
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="flex-end"
          sx={{ width: { xs: '100%', md: 'auto' } }}
        >
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ArrowForwardIcon />}
            component={RouterLink}
            to="/payroll"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Payroll
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateOpen(true)}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            New employee
          </Button>
        </Stack>
      </Stack>

      {/* Search and Filters */}
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Search employees"
              placeholder="Search by name, job title, or NIC"
              size="small"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ flexGrow: 1 }}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentFilter}
                label="Department"
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="manager">Management</MenuItem>
                <MenuItem value="engineer">Engineering</MenuItem>
                <MenuItem value="sales">Sales</MenuItem>
                <MenuItem value="hr">Human Resources</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {hasActiveFilters && (
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterListIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {filteredEmployees.length} of {employees.length} employees shown
              </Typography>
              <Button size="small" onClick={clearFilters}>
                Clear filters
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Unable to fetch employees. Please try again later.'}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={2}>
          {/* Loading skeletons */}
          {[1, 2, 3, 4, 5].map((i) => (
            <Paper key={i} sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="40%" height={20} />
                </Box>
                <Skeleton variant="rectangular" width={80} height={36} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : filteredEmployees.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {hasActiveFilters ? 'No matching employees' : 'No employees yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {hasActiveFilters
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Create your first employee profile to begin managing payroll, leave, and attendance.'}
          </Typography>
          {hasActiveFilters ? (
            <Button variant="outlined" sx={{ mt: 3 }} onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button variant="contained" sx={{ mt: 3 }} onClick={() => setIsCreateOpen(true)}>
              Add employee
            </Button>
          )}
        </Paper>
      ) : isMobile ? (
        <Stack spacing={2}>
          {filteredEmployees.map((employee: Employee) => (
            <Card key={employee.id}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6" fontWeight={600}>
                    {employee.first_name} {employee.last_name}
                  </Typography>
                  <Chip label={employee.job_title} color="primary" size="small" sx={{ alignSelf: 'flex-start' }} />
                  <Typography variant="body2" color="text.secondary">
                    📞 {employee.phone_number}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📍 {employee.address}
                  </Typography>
                  <Button
                    component={RouterLink}
                    to={`/employees/${employee.id}`}
                    variant="outlined"
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    View profile
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Job title</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Address</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.map((employee: Employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>
                      {employee.first_name} {employee.last_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={employee.job_title} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>{employee.phone_number}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {employee.address}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={`/employees/${employee.id}`}
                      variant="outlined"
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination controls */}
      {pagination && (pagination.totalPages ?? 0) > 1 && (
        <Stack direction="row" justifyContent="flex-end" spacing={1.5} alignItems="center">
          <Typography variant="caption" color="text.secondary" aria-live="polite">
            Page {pagination.page} of {pagination.totalPages}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagination.page <= 1 || isLoading}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setPage((p) => p + 1)}
            disabled={pagination.page >= (pagination.totalPages ?? 0) || isLoading}
            aria-label="Next page"
          >
            Next
          </Button>
        </Stack>
      )}

      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Create employee</DialogTitle>
        <DialogContent dividers>
          <EmployeeForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Stack>
  );
};

export default EmployeeList;
