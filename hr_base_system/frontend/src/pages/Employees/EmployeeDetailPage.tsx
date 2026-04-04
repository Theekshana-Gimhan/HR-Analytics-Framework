import React, { useState } from 'react';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import {
  useEmployee,
  useLeaveBalance,
  useEmployeeDocuments,
  useDeleteEmployee,
} from '../../lib/api/hooks';
import { employeesApi, EmployeeDocument } from '../../lib/api';
import useFeedback from '../../hooks/useFeedback';
import EmployeeForm from '../../components/employee/EmployeeForm';

const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useFeedback();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteEmployee = useDeleteEmployee();

  const {
    data: employeeRaw,
    isLoading: isLoadingEmployee,
    error: errorEmployee,
  } = useEmployee(id!);

  // Normalize backend snake_case employee object to legacy camelCase expectations in this component
  // Type for API response with both camelCase and snake_case fields
  type ApiEmployee = typeof employeeRaw & {
    // camelCase variants that may come from API
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    department?: string;
    isActive?: boolean;
    user?: { email?: string };
    email?: string;
    nic?: string;
    date_of_birth?: string | null;
    dateOfBirth?: string | null;
    phone_number?: string;
    phone?: string;
    address?: string;
    employmentStartDate?: string;
    hire_date?: string;
    bank_name?: string | null;
    bankName?: string | null;
    account_number?: string | null;
    bank_account_number?: string | null;
    branch_code?: string | null;
    bank_branch?: string | null;
    salary?: number;
  };

  const employee = employeeRaw
    ? {
      ...employeeRaw,
      first_name: employeeRaw.first_name ?? employeeRaw.firstName,
      last_name: employeeRaw.last_name ?? employeeRaw.lastName,
      job_title: employeeRaw.job_title ?? employeeRaw.jobTitle,
      department: (employeeRaw as ApiEmployee).department ?? 'General',
      is_active: (employeeRaw as ApiEmployee).isActive ?? employeeRaw.is_active ?? true,
      email: (employeeRaw as ApiEmployee).user?.email ?? (employeeRaw as ApiEmployee).email ?? '',
      nic: (employeeRaw as ApiEmployee).nic ?? '',
      date_of_birth: (employeeRaw as ApiEmployee).date_of_birth ?? (employeeRaw as ApiEmployee).dateOfBirth ?? null,
      phone_number: (employeeRaw as ApiEmployee).phone_number ?? (employeeRaw as ApiEmployee).phone ?? '',
      address: (employeeRaw as ApiEmployee).address ?? '',
      hire_date: (employeeRaw as ApiEmployee).employmentStartDate ?? (employeeRaw as ApiEmployee).hire_date ?? new Date().toISOString(),
      bank_name: (employeeRaw as ApiEmployee).bank_name ?? (employeeRaw as ApiEmployee).bankName ?? null,
      bank_account_number: (employeeRaw as ApiEmployee).account_number ?? (employeeRaw as ApiEmployee).bank_account_number ?? null,
      bank_branch: (employeeRaw as ApiEmployee).branch_code ?? (employeeRaw as ApiEmployee).bank_branch ?? null,
      salary: (employeeRaw as ApiEmployee).salary ?? 0,
    }
    : null;

  const {
    data: leaveBalancesRaw,
    isLoading: isLoadingBalances,
  } = useLeaveBalance(id!);

  const leaveBalances = Array.isArray(leaveBalancesRaw)
    ? leaveBalancesRaw.map((b: { leaveType?: { id?: number; name?: string; defaultBalance?: number }; leaveTypeId?: number; leaveTypeName?: string; id?: number; used?: number; consumed?: number; accrued?: number; total?: number; carriedForward?: number }) => ({
      leaveTypeId: b.leaveType?.id ?? b.leaveTypeId ?? b.id,
      leaveTypeName: b.leaveType?.name ?? b.leaveTypeName ?? 'Leave',
      used: b.used ?? b.consumed ?? 0,
      total: (b.leaveType?.defaultBalance ?? b.total ?? b.accrued ?? 0) + (b.carriedForward ?? 0),
      balance: (b.accrued ?? b.total ?? 0) - (b.used ?? b.consumed ?? 0),
    }))
    : [];

  const {
    data: documentsRaw,
    isLoading: isLoadingDocuments,
  } = useEmployeeDocuments(id!);

  // API returns EmployeeDocument[] directly
  const documents: EmployeeDocument[] = Array.isArray(documentsRaw) ? documentsRaw : [];

  const isLoading = isLoadingEmployee || isLoadingBalances || isLoadingDocuments;
  const error = errorEmployee;

  const handleDownloadDocument = async (docId: number, fileName: string) => {
    try {
      const response = await employeesApi.downloadDocument(id!, docId.toString());

      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notifySuccess('Document downloaded successfully');
    } catch (err) {
      console.error('Failed to download document', err);
      notifyError('Unable to download document');
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    // The query invalidation in useUpdateEmployee will handle the refresh
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      await deleteEmployee.mutateAsync(id);
      notifySuccess('Employee deleted successfully');
      navigate('/employees');
    } catch (err) {
      console.error('Failed to delete employee', err);
      notifyError('Failed to delete employee. Please try again.');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Stack alignItems="center" py={8}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error || !employee) {
    return (
      <Stack spacing={2}>
        <Button
          component={RouterLink}
          to="/employees"
          startIcon={<ArrowBackIcon />}
          sx={{ alignSelf: 'flex-start' }}
        >
          Back to employees
        </Button>
        <Alert severity="error">{error?.message || 'Employee not found'}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Button
            component={RouterLink}
            to="/employees"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            size="small"
          >
            Back
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {employee.first_name} {employee.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {employee.job_title} • {employee.department}
            </Typography>
          </Box>
          {!employee.is_active && (
            <Chip label="Inactive" color="error" size="small" />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<DeleteIcon />}
            variant="outlined"
            color="error"
            onClick={handleDeleteClick}
          >
            Delete
          </Button>
          <Button
            startIcon={<EditIcon />}
            variant="contained"
            onClick={() => setIsEditOpen(true)}
          >
            Edit profile
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, minmax(0, 1fr))',
          },
        }}
      >
        {/* Personal Information */}
        <Card>
          <CardHeader title="Personal information" />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body2">{employee.email}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  NIC
                </Typography>
                <Typography variant="body2">{employee.nic}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Date of birth
                </Typography>
                <Typography variant="body2">
                  {employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : 'Not set'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body2">{employee.phone_number}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body2">{employee.address}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader title="Employment details" />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Hire date
                </Typography>
                <Typography variant="body2">
                  {new Date(employee.hire_date).toLocaleDateString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Salary
                </Typography>
                <Typography variant="body2">{formatCurrency(employee.salary)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Bank
                </Typography>
                <Typography variant="body2">
                  {employee.bank_name || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Account number
                </Typography>
                <Typography variant="body2">
                  {employee.bank_account_number || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Branch
                </Typography>
                <Typography variant="body2">
                  {employee.bank_branch || 'Not specified'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Leave Balances */}
        <Card>
          <CardHeader
            title="Leave balances"
            subheader="Current allocations and usage"
          />
          <Divider />
          <CardContent>
            {!leaveBalances || leaveBalances.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No leave balances configured
              </Typography>
            ) : (
              <Stack spacing={2}>
                {leaveBalances.map((balance) => (
                  <Paper key={balance.leaveTypeId} sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {balance.leaveTypeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Used: {balance.used} / {balance.total}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${balance.balance} remaining`}
                        color={balance.balance > 5 ? 'success' : 'warning'}
                        size="small"
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader
            title="Documents"
            subheader="Uploaded files and attachments"
          />
          <Divider />
          <CardContent>
            {!documents || documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No documents uploaded
              </Typography>
            ) : (
              <List disablePadding>
                {documents.map((doc) => (
                  <ListItem
                    key={doc.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      '&:last-child': { mb: 0 },
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleDownloadDocument(doc.id, doc.originalName)}
                        size="small"
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <DescriptionIcon sx={{ mr: 1.5, color: 'text.secondary' }} />
                    <ListItemText
                      primary={doc.originalName}
                      secondary={`${doc.mimeType} • ${formatFileSize(doc.size)} • ${new Date(
                        doc.createdAt
                      ).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Edit Employee Profile</DialogTitle>
        <DialogContent dividers>
          {employee && (
            <EmployeeForm
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditOpen(false)}
              employeeId={id}
              initialData={{
                firstName: employee.first_name,
                lastName: employee.last_name,
                email: employee.email,
                nic: employee.nic,
                phone: employee.phone_number,
                dateOfBirth: employee.date_of_birth ? new Date(employee.date_of_birth).toISOString().split('T')[0] : '',
                gender: ((employeeRaw as { gender?: string }).gender || 'Male') as 'Male' | 'Female' | 'Other',
                address: employee.address,
                jobTitle: employee.job_title,
                department: employee.department,
                joinDate: employee.hire_date ? new Date(employee.hire_date).toISOString().split('T')[0] : '',
                basicSalary: employee.salary.toString(),
                allowances: (employeeRaw as { allowances?: number }).allowances?.toString() || '',
                bankName: employee.bank_name || '',
                bankBranch: employee.bank_branch || '',
                accountNumber: employee.bank_account_number || '',
                accountHolderName: (employeeRaw as { account_holder_name?: string }).account_holder_name || '',
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Employee
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete {employee?.first_name} {employee?.last_name}?
            This action will mark the employee as inactive. This cannot be easily undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            autoFocus
          >
            {isDeleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default EmployeeDetail;
