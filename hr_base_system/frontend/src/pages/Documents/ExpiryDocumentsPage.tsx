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
  CircularProgress,
  Alert,
  TablePagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import {
  useExpiryDocuments,
  useExpiryDocumentSummary,
  useCreateExpiryDocument,
  useUpdateExpiryDocument,
  useDeleteExpiryDocument,
} from '../../lib/api/hooks';
import { getCurrentUserRole } from '../../lib/auth';
import type {
  ExpiryDocument,
  ExpiryDocumentListParams,
  CreateExpiryDocumentData,
  UpdateExpiryDocumentData,
} from '../../lib/api/expiryDocuments';

const DOCUMENT_TYPES = [
  'LICENSE', 'CERTIFICATION', 'VISA', 'WORK_PERMIT',
  'MEDICAL_CERTIFICATE', 'BACKGROUND_CHECK', 'OTHER',
];

const STATUS_OPTIONS = ['VALID', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED'];

const PAGE_SIZES = [25, 50, 100];

const statusChip = (status: string) => {
  const map: Record<string, { color: 'success' | 'warning' | 'error' | 'info'; icon: React.ReactElement }> = {
    VALID: { color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
    EXPIRING_SOON: { color: 'warning', icon: <WarningIcon fontSize="small" /> },
    EXPIRED: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
    RENEWED: { color: 'info', icon: <AutorenewIcon fontSize="small" /> },
  };
  const cfg = map[status] ?? { color: 'info' as const, icon: undefined };
  return <Chip label={status.replace('_', ' ')} size="small" color={cfg.color} icon={cfg.icon} variant="outlined" />;
};

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDocType = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const ExpiryDocumentsPage: React.FC = () => {
  const role = getCurrentUserRole();
  const isAdmin = role === 'ADMIN' || role === 'OWNER';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<ExpiryDocument | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateExpiryDocumentData & { status?: string }>>({});

  const params: ExpiryDocumentListParams = useMemo(() => ({
    limit: rowsPerPage,
    offset: page * rowsPerPage,
    ...(statusFilter && { status: statusFilter }),
    ...(typeFilter && { documentType: typeFilter }),
  }), [page, rowsPerPage, statusFilter, typeFilter]);

  const { data, isLoading, error } = useExpiryDocuments(params);
  const { data: summary } = useExpiryDocumentSummary();
  const createMutation = useCreateExpiryDocument();
  const updateMutation = useUpdateExpiryDocument();
  const deleteMutation = useDeleteExpiryDocument();

  const openCreate = () => {
    setEditDoc(null);
    setFormData({ alertDaysBefore: 30 });
    setDialogOpen(true);
  };

  const openEdit = (doc: ExpiryDocument) => {
    setEditDoc(doc);
    setFormData({
      employeeId: doc.employeeId,
      documentType: doc.documentType,
      name: doc.name,
      issueDate: doc.issueDate?.split('T')[0] ?? '',
      expiryDate: doc.expiryDate.split('T')[0],
      alertDaysBefore: doc.alertDaysBefore,
      notes: doc.notes ?? '',
      status: doc.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editDoc) {
        const updateData: UpdateExpiryDocumentData = {};
        if (formData.name) updateData.name = formData.name;
        if (formData.documentType) updateData.documentType = formData.documentType;
        if (formData.issueDate) updateData.issueDate = formData.issueDate;
        if (formData.expiryDate) updateData.expiryDate = formData.expiryDate;
        if (formData.alertDaysBefore) updateData.alertDaysBefore = formData.alertDaysBefore;
        if (formData.notes !== undefined) updateData.notes = formData.notes;
        if (formData.status) updateData.status = formData.status;
        await updateMutation.mutateAsync({ id: editDoc.id, data: updateData });
      } else {
        await createMutation.mutateAsync(formData as CreateExpiryDocumentData);
      }
      setDialogOpen(false);
    } catch {
      // Error handled by React Query
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <WarningIcon color="primary" />
          <Typography variant="h5" fontWeight={600}>Document Expiry Tracker</Typography>
        </Stack>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Document
          </Button>
        )}
      </Stack>

      {/* Summary Cards */}
      {summary && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight={700}>{summary.valid}</Typography>
              <Typography variant="body2" color="text.secondary">Valid</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight={700}>{summary.expiringSoon}</Typography>
              <Typography variant="body2" color="text.secondary">Expiring Soon</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main" fontWeight={700}>{summary.expired}</Typography>
              <Typography variant="body2" color="text.secondary">Expired</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700}>{summary.total}</Typography>
              <Typography variant="body2" color="text.secondary">Total</Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All Statuses</MenuItem>
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Document Type</InputLabel>
              <Select value={typeFilter} label="Document Type" onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All Types</MenuItem>
                {DOCUMENT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>{formatDocType(t)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load expiry documents.
        </Alert>
      )}

      {data && !isLoading && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Document</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Expiry Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Alert</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No expiry documents found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.documents.map((doc: ExpiryDocument) => (
                    <TableRow key={doc.id} hover>
                      <TableCell>
                        {doc.employee ? `${doc.employee.first_name} ${doc.employee.last_name}` : `Emp #${doc.employeeId}`}
                        {doc.employee?.department && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {doc.employee.department}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{doc.name}</Typography>
                        {doc.notes && (
                          <Tooltip title={doc.notes}>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 150, display: 'block' }}>
                              {doc.notes}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>{formatDocType(doc.documentType)}</TableCell>
                      <TableCell>{formatDate(doc.expiryDate)}</TableCell>
                      <TableCell>{statusChip(doc.status)}</TableCell>
                      <TableCell>{doc.alertDaysBefore}d</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <IconButton size="small" onClick={() => openEdit(doc)} title="Edit">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(doc.id)} title="Delete">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
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
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={PAGE_SIZES}
          />
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editDoc ? 'Edit Expiry Document' : 'Add Expiry Document'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!editDoc && (
              <TextField
                label="Employee ID"
                type="number"
                value={formData.employeeId ?? ''}
                onChange={(e) => setFormData({ ...formData, employeeId: Number(e.target.value) })}
                required
                size="small"
              />
            )}
            <TextField
              label="Document Name"
              value={formData.name ?? ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              size="small"
            />
            <FormControl size="small" required>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={formData.documentType ?? ''}
                label="Document Type"
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>{formatDocType(t)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Issue Date"
              type="date"
              value={formData.issueDate ?? ''}
              onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              label="Expiry Date"
              type="date"
              value={formData.expiryDate ?? ''}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
              size="small"
            />
            <TextField
              label="Alert Days Before"
              type="number"
              value={formData.alertDaysBefore ?? 30}
              onChange={(e) => setFormData({ ...formData, alertDaysBefore: Number(e.target.value) })}
              size="small"
              inputProps={{ min: 1, max: 365 }}
            />
            {editDoc && (
              <FormControl size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status ?? ''}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              label="Notes"
              value={formData.notes ?? ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={2}
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editDoc ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this expiry document? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleteMutation.isPending}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpiryDocumentsPage;
