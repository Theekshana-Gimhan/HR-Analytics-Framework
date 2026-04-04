import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import apiClient from '../../lib/apiClient';
import useFeedback from '../../hooks/useFeedback';
import { getCurrentUserRole } from '../../lib/auth';

// Allowed file types (matching backend)
const ALLOWED_FILE_TYPES = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
};
const ALLOWED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';
const MAX_FILE_SIZE_MB = 10;

type Document = {
  id: number;
  employeeId: number;
  employee?: {
    first_name: string;
    last_name: string;
  };
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
};

type Employee = {
  id: number;
  first_name: string;
  last_name: string;
};

const DocumentsPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { notifyError, notifySuccess } = useFeedback();
  
  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const userRole = getCurrentUserRole();
  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

  // Type for API document response with both camelCase and snake_case fields
  type ApiDocument = {
    id: string | number;
    employeeId?: string | number;
    employee_id?: string | number;
    employee?: {
      firstName?: string;
      first_name?: string;
      lastName?: string;
      last_name?: string;
    };
    file_name?: string;
    originalName?: string;
    name?: string;
    file_type?: string;
    mimeType?: string;
    file_size?: number;
    size?: number;
    uploaded_at?: string;
    createdAt?: string;
  };

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<ApiDocument[] | { items: ApiDocument[] }>(
        '/employees/documents',
        {
          params: search ? { search } : undefined,
        }
      );
      const raw = Array.isArray(response.data)
        ? response.data
        : response.data?.items ?? [];

      // Normalize API payload to the Document shape expected by this UI
      const normalized: Document[] = raw.map((doc: ApiDocument) => ({
        id: typeof doc.id === 'string' ? parseInt(doc.id, 10) : doc.id,
        employeeId: Number(doc.employeeId ?? doc.employee_id ?? 0),
        employee: doc.employee
          ? {
              first_name: doc.employee.firstName ?? doc.employee.first_name ?? '',
              last_name: doc.employee.lastName ?? doc.employee.last_name ?? '',
            }
          : undefined,
        file_name: doc.file_name ?? doc.originalName ?? doc.name ?? 'document',
        file_type: doc.file_type ?? doc.mimeType ?? 'application/octet-stream',
        file_size: doc.file_size ?? doc.size ?? 0,
        uploaded_at: doc.uploaded_at ?? doc.createdAt ?? new Date().toISOString(),
      }));

      setDocuments(normalized);
    } catch (err: unknown) {
      console.error('Failed to fetch documents', err);
      // If backend doesn't have the collection endpoint yet and returns 400/"Invalid id",
      // treat it as an empty dataset instead of surfacing an error to the user.
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axiosError?.response?.status;
      const message = axiosError?.response?.data?.message;
      if (status === 400 && typeof message === 'string' && message.toLowerCase().includes('invalid')) {
        setDocuments([]);
        setError(null);
      } else {
        setError('Unable to fetch documents. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  // Fetch employees for upload dropdown (admin only)
  const fetchEmployees = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await apiClient.get<{ data: Employee[] } | Employee[]>('/employees');
      const data = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchDocuments();
    fetchEmployees();
  }, [fetchDocuments, fetchEmployees]);

  // Handle file selection with validation
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = event.target.files?.[0];
    if (!file) {
      setUploadFile(null);
      return;
    }
    
    // Validate file type
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      setUploadError(`Invalid file type. Allowed types: ${Object.values(ALLOWED_FILE_TYPES).join(', ')}`);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setUploadError(`File too large. Maximum size: ${MAX_FILE_SIZE_MB}MB`);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    setUploadFile(file);
  };

  // Handle document upload
  const handleUpload = async () => {
    if (!uploadFile || !selectedEmployeeId) {
      setUploadError('Please select an employee and a file');
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      await apiClient.post(`/employees/${selectedEmployeeId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      notifySuccess('Document uploaded successfully');
      setUploadFile(null);
      setSelectedEmployeeId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (err: unknown) {
      console.error('Failed to upload document', err);
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message = axiosError?.response?.data?.message || 'Failed to upload document. Please try again.';
      setUploadError(message);
      notifyError(message);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle download - fixed to use correct API path with employeeId
  const handleDownload = async (employeeId: number, docId: number, fileName: string) => {
    try {
      const response = await apiClient.get(`/employees/${employeeId}/documents/${docId}`, {
        responseType: 'blob',
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notifySuccess('Document downloaded successfully.');
    } catch (err) {
      console.error('Failed to download document', err);
      notifyError('Unable to download document. Please try again.');
    }
  };

  // Handle delete confirmation dialog
  const openDeleteDialog = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  // Handle document delete
  const handleDelete = async () => {
    if (!documentToDelete) return;
    
    setIsDeleting(true);
    try {
      await apiClient.delete(`/employees/${documentToDelete.employeeId}/documents/${documentToDelete.id}`);
      notifySuccess('Document deleted successfully');
      closeDeleteDialog();
      fetchDocuments();
    } catch (err: unknown) {
      console.error('Failed to delete document', err);
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message = axiosError?.response?.data?.message || 'Failed to delete document. Please try again.';
      notifyError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Employee Documents
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage documents uploaded for all employees
        </Typography>
      </Box>

      {/* Upload Section - Admin/Owner only */}
      {isAdmin && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upload Document
            </Typography>
            <Stack spacing={2}>
              <Alert severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  <strong>Allowed file types:</strong> PDF, JPEG, PNG | <strong>Max size:</strong> {MAX_FILE_SIZE_MB}MB
                </Typography>
              </Alert>
              
              {uploadError && <Alert severity="error">{uploadError}</Alert>}
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={selectedEmployeeId}
                    label="Employee"
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  >
                    {employees.map((emp) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  disabled={isUploading}
                >
                  {uploadFile ? 'Change File' : 'Select File'}
                  <input
                    hidden
                    type="file"
                    accept={ALLOWED_EXTENSIONS}
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                </Button>
                
                {uploadFile && (
                  <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {uploadFile.name} ({formatFileSize(uploadFile.size)})
                  </Typography>
                )}
                
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={!uploadFile || !selectedEmployeeId || isUploading}
                >
                  {isUploading ? <CircularProgress size={24} /> : 'Upload'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
            >
              <TextField
                label="Search documents"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                placeholder="Search by file name or employee..."
                sx={{ minWidth: { sm: 300 } }}
              />
              <Button
                startIcon={<RefreshIcon />}
                onClick={fetchDocuments}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            {isLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : documents.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                py={6}
              >
                <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No documents available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {search
                    ? 'Try adjusting your search criteria'
                    : 'Documents will appear here once uploaded'}
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>File Name</TableCell>
                      <TableCell>Employee</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Upload Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <DescriptionIcon fontSize="small" color="action" />
                            <Typography variant="body2">{doc.file_name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {doc.employee
                            ? `${doc.employee.first_name} ${doc.employee.last_name}`
                            : `Employee #${doc.employeeId}`}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ALLOWED_FILE_TYPES[doc.file_type as keyof typeof ALLOWED_FILE_TYPES] || doc.file_type} 
                            size="small" 
                            color={Object.keys(ALLOWED_FILE_TYPES).includes(doc.file_type) ? 'default' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                        <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(doc.employeeId, doc.id, doc.file_name)}
                              title="Download document"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                            {isAdmin && (
                              <IconButton
                                size="small"
                                onClick={() => openDeleteDialog(doc)}
                                title="Delete document"
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Typography variant="caption" color="text.secondary">
              Total documents: {documents.length}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default DocumentsPage;
