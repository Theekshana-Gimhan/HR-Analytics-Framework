import React, { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Stack,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useBulkUploadAttendance } from '../../lib/api/hooks';
import useFeedback from '../../hooks/useFeedback';

interface AttendanceBulkUploadProps {
  onSuccess?: () => void;
}

const AttendanceBulkUpload = ({ onSuccess }: AttendanceBulkUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { notifyError, notifySuccess } = useFeedback();

  const bulkUpload = useBulkUploadAttendance();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setUploadErrors([]);
      setImportedCount(null);
      bulkUpload.reset(); // Clear any previous errors/success
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      notifyError('Please choose a CSV file to upload.');
      return;
    }

    try {
      const result = await bulkUpload.mutateAsync(file);
      setFile(null);
      setUploadErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Show success with count
      const count = result?.imported || 0;
      setImportedCount(count);
      notifySuccess(`Successfully imported ${count} attendance record${count !== 1 ? 's' : ''}.`);
      onSuccess?.();
    } catch (err: unknown) {
      console.error('Failed to upload attendance data', err);
      // Extract detailed error from API response
      const error = err as { response?: { data?: { message?: string; errors?: string[] } } };
      const errorMessage = error.response?.data?.message || 'Unable to process the file. Please try again.';
      const errors = error.response?.data?.errors || [];
      setUploadErrors(errors);
      setImportedCount(null);
      notifyError(errorMessage);
    }
  };

  return (
    <Card component="form" onSubmit={handleSubmit}>
      <CardHeader
        title="Bulk upload"
        subheader="Import attendance records from a CSV export"
      />
      <CardContent>
        <Stack spacing={3}>
          {/* Success message with count */}
          {importedCount !== null && (
            <Alert severity="success">
              Successfully imported {importedCount} attendance record{importedCount !== 1 ? 's' : ''}.
            </Alert>
          )}

          {/* Error message with details */}
          {uploadErrors.length > 0 && (
            <Alert severity="error">
              <Typography variant="body2" fontWeight={600}>
                Upload failed with the following errors:
              </Typography>
              <List dense sx={{ pl: 2 }}>
                {uploadErrors.map((error, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemText primary={`• ${error}`} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {bulkUpload.error && uploadErrors.length === 0 && (
            <Alert severity="error">
              Failed to upload file. Please check the file format and try again.
              <Typography variant="body2" sx={{ mt: 1 }}>
                Required CSV format: employeeId, date, status (PRESENT or ABSENT)
              </Typography>
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            CSV must contain columns: <strong>employeeId</strong>, <strong>date</strong>, <strong>status</strong>
            <br />
            Status values: PRESENT, ABSENT
            <br />
            Date format: YYYY-MM-DD
          </Typography>

          <Stack spacing={1} direction="column">
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={bulkUpload.isPending}
            >
              {file ? 'Change file' : 'Select CSV'}
              <input
                hidden
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
            </Button>
            <Typography variant="caption" color="text.secondary">
              {file ? file.name : 'No file selected'}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', px: 3, pb: 3 }}>
        <Button type="submit" variant="contained" disabled={bulkUpload.isPending || !file}>
          {bulkUpload.isPending ? <CircularProgress size={24} /> : 'Upload file'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default AttendanceBulkUpload;
