import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import type { AttendanceStatus } from '@simpala/types';

interface CorrectionRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    date: string;
    requestedStatus: AttendanceStatus;
    reason: string;
    attendanceId?: number;
  }) => Promise<void>;
  prefillDate?: string;
  prefillAttendanceId?: number;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  WFH: 'Work From Home',
  ON_LEAVE: 'On Leave',
};

const CorrectionRequestDialog: React.FC<CorrectionRequestDialogProps> = ({
  open,
  onClose,
  onSubmit,
  prefillDate,
  prefillAttendanceId,
}) => {
  const [date, setDate] = useState(prefillDate || new Date().toISOString().split('T')[0]);
  const [requestedStatus, setRequestedStatus] = useState<AttendanceStatus>('PRESENT');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!date || !reason.trim()) {
      setError('Date and reason are required.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Reason must be at least 3 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        date,
        requestedStatus,
        reason: reason.trim(),
        attendanceId: prefillAttendanceId,
      });
      setReason('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit correction request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Request Attendance Correction</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
        />

        <FormControl size="small" fullWidth>
          <InputLabel>Requested Status</InputLabel>
          <Select
            value={requestedStatus}
            label="Requested Status"
            onChange={(e) => setRequestedStatus(e.target.value as AttendanceStatus)}
          >
            {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          rows={3}
          fullWidth
          size="small"
          placeholder="Explain why you need this correction..."
          inputProps={{ maxLength: 500 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          Submit Request
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CorrectionRequestDialog;
