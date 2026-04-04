
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Box,
    Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { shiftTemplatesApi, ShiftTemplate, rosterApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/apiClient';

const assignShiftSchema = z.object({
    shiftTemplateId: z.number().min(1, 'Shift template is required'),
});

type AssignShiftFormInputs = z.infer<typeof assignShiftSchema>;

interface AssignShiftDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employeeId: number;
    employeeName: string;
    date: string; // YYYY-MM-DD
}

const AssignShiftDialog: React.FC<AssignShiftDialogProps> = ({
    open,
    onClose,
    onSuccess,
    employeeId,
    employeeName,
    date,
}) => {
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [error, setError] = useState<string | null>(null);

    const { control, handleSubmit, reset, formState: { errors } } = useForm<AssignShiftFormInputs>({
        resolver: zodResolver(assignShiftSchema),
    });

    useEffect(() => {
        if (open) {
            loadTemplates();
            reset();
            setError(null);
        }
    }, [open]);

    const loadTemplates = async () => {
        try {
            const data = await shiftTemplatesApi.list();
            setTemplates(data);
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const onSubmit = async (data: AssignShiftFormInputs) => {
        try {
            await rosterApi.assignShift({
                employeeId,
                shiftTemplateId: data.shiftTemplateId,
                date,
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Assign Shift</DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary">Employee: {employeeName}</Typography>
                        <Typography variant="body2" color="textSecondary">Date: {date}</Typography>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <FormControl fullWidth error={!!errors.shiftTemplateId}>
                        <InputLabel id="shift-select-label">Shift Template</InputLabel>
                        <Controller
                            name="shiftTemplateId"
                            control={control}
                            defaultValue={0}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    labelId="shift-select-label"
                                    label="Shift Template"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                >
                                    <MenuItem value={0} disabled>Select a shift</MenuItem>
                                    {templates.map((t) => (
                                        <MenuItem key={t.id} value={t.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: t.color || 'grey' }} />
                                                {t.name} ({t.startTime} - {t.endTime})
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            )}
                        />
                        {errors.shiftTemplateId && (
                            <Typography color="error" variant="caption">{errors.shiftTemplateId.message}</Typography>
                        )}
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained">Assign</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default AssignShiftDialog;
