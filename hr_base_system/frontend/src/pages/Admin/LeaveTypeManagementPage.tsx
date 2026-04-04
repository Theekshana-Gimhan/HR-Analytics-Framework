import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import apiClient from '../../lib/apiClient';
import { getCurrentCompanyId } from '../../lib/auth';

type LeaveType = {
  id: number;
  name: string;
  defaultBalance: number;
  requiresAnniversary: boolean;
  description?: string;
};

type LeaveTypeFormData = {
  name: string;
  default_balance: number;
  requires_anniversary: boolean;
};

const LeaveTypeManagement = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; leaveType: LeaveType | null }>({
    open: false,
    leaveType: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);

  // Form state
  const [formData, setFormData] = useState<LeaveTypeFormData>({
    name: '',
    default_balance: 14,
    requires_anniversary: false,
  });

  const fetchLeaveTypes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<LeaveType[] | { items: LeaveType[] }>('/leave/types');
      const payload = Array.isArray(response.data) ? response.data : response.data?.items ?? [];
      setLeaveTypes(payload);
    } catch (err) {
      console.error('Failed to fetch leave types', err);
      setError('Unable to load leave types right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const handleOpenDialog = (leaveType?: LeaveType) => {
    if (leaveType) {
      setEditingType(leaveType);
      setFormData({
        name: leaveType.name,
        default_balance: leaveType.defaultBalance,
        requires_anniversary: leaveType.requiresAnniversary,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        default_balance: 14,
        requires_anniversary: false,
      });
    }
    setOpenDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingType(null);
    setFormData({
      name: '',
      default_balance: 14,
      requires_anniversary: false,
    });
  };

  const handleOpenDeleteDialog = (leaveType: LeaveType) => {
    setDeleteDialog({ open: true, leaveType });
    setError(null);
    setSuccess(null);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ open: false, leaveType: null });
  };

  const handleDelete = async () => {
    if (!deleteDialog.leaveType) return;

    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.delete(`/leave/types/${deleteDialog.leaveType.id}`);
      setSuccess(`Leave type "${deleteDialog.leaveType.name}" deleted successfully!`);

      // Refresh the list to reflect the deletion
      await fetchLeaveTypes();
      handleCloseDeleteDialog();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to delete leave type', err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as Error)?.message ||
        'Failed to delete leave type. Please try again.';
      setError(errorMessage);
      handleCloseDeleteDialog();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Get companyId from localStorage (set during login)
      const companyId = getCurrentCompanyId();

      if (!companyId) {
        throw new Error('Company ID not found. Please log out and log in again.');
      }

      const payload = {
        ...formData,
        companyId,
      };

      if (editingType) {
        // Update existing leave type (if endpoint exists)
        await apiClient.put(`/leave/types/${editingType.id}`, payload);
        setSuccess('Leave type updated successfully!');
      } else {
        // Create new leave type
        await apiClient.post('/leave/types', payload);
        setSuccess('Leave type created successfully!');
      }

      // Refresh the list
      await fetchLeaveTypes();
      handleCloseDialog();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save leave type', err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as Error)?.message ||
        'Failed to save leave type. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1">
          Leave Type Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={isLoading}
        >
          Add Leave Type
        </Button>
      </Stack>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {error && !openDialog && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Configured Leave Types"
          subheader="Manage the types of leave available to employees"
        />
        <Divider />
        <CardContent>
          {isLoading ? (
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" height={80} />
              ))}
            </Stack>
          ) : leaveTypes.length === 0 ? (
            <Alert severity="info">
              <strong>No leave types configured yet</strong>
              <br />
              Click "Add Leave Type" to create your first leave type (e.g., Annual Leave, Sick Leave).
            </Alert>
          ) : (
            <List disablePadding>
              {leaveTypes.map((leaveType) => (
                <Paper key={leaveType.id} elevation={0} sx={{ mb: 2, border: 1, borderColor: 'divider' }}>
                  <ListItem
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 2,
                      py: 2,
                    }}
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit leave type">
                          <IconButton edge="end" onClick={() => handleOpenDialog(leaveType)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete leave type">
                          <IconButton
                            edge="end"
                            onClick={() => handleOpenDeleteDialog(leaveType)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    }
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Chip label={leaveType.name} color="primary" />
                        {leaveType.requiresAnniversary && (
                          <Chip
                            label="Requires Anniversary"
                            size="small"
                            variant="outlined"
                            icon={<CheckCircleIcon />}
                          />
                        )}
                      </Stack>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="text.secondary">
                            Default Balance: <strong>{leaveType.defaultBalance} days</strong>
                          </Typography>
                        }
                        secondary={leaveType.description || 'No description provided'}
                      />
                    </Box>
                  </ListItem>
                </Paper>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingType ? 'Edit Leave Type' : 'Create New Leave Type'}</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Leave Type Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
                placeholder="e.g., Annual Leave, Sick Leave"
                helperText="A clear, descriptive name for this leave type"
              />

              <TextField
                label="Default Balance (Days)"
                type="number"
                value={formData.default_balance}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_balance: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
                required
                fullWidth
                inputProps={{ min: 0, step: 0.5 }}
                helperText="Number of days employees get per year"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.requires_anniversary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requires_anniversary: e.target.checked,
                      })
                    }
                  />
                }
                label="Requires Anniversary"
              />

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Note:</strong> When you create a leave type, the system will automatically create balance
                  records for all active employees with the default balance.
                </Typography>
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting} startIcon={isSubmitting && <CircularProgress size={16} />}>
              {isSubmitting ? 'Saving...' : editingType ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Leave Type</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteDialog.leaveType?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. Any associated leave balances and requests may be affected.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting && <CircularProgress size={16} />}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveTypeManagement;
