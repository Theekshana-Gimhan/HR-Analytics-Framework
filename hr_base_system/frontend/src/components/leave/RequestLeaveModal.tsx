
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Stack,
    Alert,
    Typography,
    Box,
    IconButton,
    Divider,
} from '@mui/material';
import { Close as CloseIcon, CloudUpload as UploadIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface RequestLeaveModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit?: (data: Record<string, unknown>) => void;
}

const leaveTypes = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'casual', label: 'Casual Leave' },
    { value: 'sick', label: 'Sick Leave' },
];

const RequestLeaveModal: React.FC<RequestLeaveModalProps> = ({ open, onClose, onSubmit }) => {
    const theme = useTheme();
    const [formData, setFormData] = useState({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
    });

    const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [field]: event.target.value });
    };

    const calculateDays = () => {
        if (!formData.startDate || !formData.endDate) return 0;
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays > 0 ? diffDays : 0;
    };

    const days = calculateDays();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                elevation: 24,
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="600">Request Leave</Typography>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ color: (theme) => theme.palette.grey[500] }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 3 }}>
                <Stack spacing={3}>
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        You have <strong>14 days</strong> of Annual Leave remaining.
                    </Alert>

                    <TextField
                        select
                        label="Leave Type"
                        fullWidth
                        value={formData.leaveType}
                        onChange={handleChange('leaveType')}
                    >
                        {leaveTypes.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Stack direction="row" spacing={2}>
                        <TextField
                            type="date"
                            label="Start Date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.startDate}
                            onChange={handleChange('startDate')}
                        />
                        <TextField
                            type="date"
                            label="End Date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.endDate}
                            onChange={handleChange('endDate')}
                        />
                    </Stack>

                    {days > 0 && (
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: theme.palette.action.hover,
                                border: `1px dashed ${theme.palette.divider}`,
                                textAlign: 'center'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">Total Duration</Typography>
                            <Typography variant="h4" color="primary" fontWeight="700">
                                {days} {days === 1 ? 'Day' : 'Days'}
                            </Typography>
                        </Box>
                    )}

                    <TextField
                        label="Reason"
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="Please detail the reason for your leave..."
                        value={formData.reason}
                        onChange={handleChange('reason')}
                    />

                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadIcon />}
                        sx={{ borderStyle: 'dashed', py: 2 }}
                    >
                        Upload Supporting Document (Optional)
                        <input type="file" hidden />
                    </Button>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button onClick={onClose} size="large" color="inherit">
                    Cancel
                </Button>
                <Button
                    onClick={() => onSubmit && onSubmit(formData)}
                    variant="contained"
                    size="large"
                    disabled={!formData.leaveType || !formData.startDate || !formData.endDate}
                >
                    Submit Request
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RequestLeaveModal;
