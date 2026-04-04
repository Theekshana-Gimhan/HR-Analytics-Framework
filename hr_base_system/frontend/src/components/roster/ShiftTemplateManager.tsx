
import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    IconButton,
    Alert,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { shiftTemplatesApi, ShiftTemplate } from '../../lib/api';
import { getErrorMessage } from '../../lib/apiClient';

// Validation Schema
const shiftTemplateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
    breakDuration: z.number().min(0).optional(),
    color: z.string().optional(),
}).refine((data) => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
});

type ShiftTemplateFormInputs = z.infer<typeof shiftTemplateSchema>;

const ShiftTemplateManager: React.FC = () => {
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);

    const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<ShiftTemplateFormInputs>({
        resolver: zodResolver(shiftTemplateSchema),
        defaultValues: {
            name: '',
            startTime: '09:00',
            endTime: '17:00',
            breakDuration: 60,
            color: '#1976d2', // Default blue
        },
    });

    const fetchTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await shiftTemplatesApi.list();
            setTemplates(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleOpen = (template?: ShiftTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setValue('name', template.name);
            setValue('startTime', template.startTime);
            setValue('endTime', template.endTime);
            setValue('color', template.color ?? '#1976d2');
            setValue('breakDuration', template.breakDuration ?? 0);
        } else {
            setEditingTemplate(null);
            reset({
                name: '',
                startTime: '09:00',
                endTime: '17:00',
                breakDuration: 60,
                color: '#1976d2',
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingTemplate(null);
        reset();
    };

    const onSubmit = async (data: ShiftTemplateFormInputs) => {
        try {
            if (editingTemplate) {
                await shiftTemplatesApi.update(editingTemplate.id, data);
            } else {
                await shiftTemplatesApi.create(data);
            }
            handleClose();
            fetchTemplates();
        } catch (err) {
            setError(getErrorMessage(err)); // Show error in UI, maybe via toast in future, but local Error state for now if global error handler doesn't catch
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            try {
                await shiftTemplatesApi.delete(id);
                fetchTemplates();
            } catch (err) {
                setError(getErrorMessage(err));
            }
        }
    };

    const columns: GridColDef[] = [
        { field: 'name', headerName: 'Name', flex: 1 },
        { field: 'startTime', headerName: 'Start Time', width: 100 },
        { field: 'endTime', headerName: 'End Time', width: 100 },
        {
            field: 'color',
            headerName: 'Color',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Box
                    sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: params.value as string,
                        border: '1px solid #ddd'
                    }}
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams) => (
                <Box>
                    <IconButton size="small" onClick={() => handleOpen(params.row as ShiftTemplate)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete((params.row as ShiftTemplate).id)}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ height: 400, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Button startIcon={<RefreshIcon />} onClick={fetchTemplates}>Refresh</Button>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
                    New Template
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <DataGrid
                rows={templates}
                columns={columns}
                loading={loading}
                disableRowSelectionOnClick
                autoHeight
            />

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>{editingTemplate ? 'Edit Shift Template' : 'New Shift Template'}</DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Template Name"
                                        fullWidth
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                    />
                                )}
                            />
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Controller
                                    name="startTime"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Start Time"
                                            type="time"
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                            error={!!errors.startTime}
                                            helperText={errors.startTime?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="endTime"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="End Time"
                                            type="time"
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                            error={!!errors.endTime}
                                            helperText={errors.endTime?.message}
                                        />
                                    )}
                                />
                            </Box>
                            <Controller
                                name="breakDuration"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Break (minutes)"
                                        type="number"
                                        fullWidth
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        error={!!errors.breakDuration}
                                        helperText={errors.breakDuration?.message}
                                    />
                                )}
                            />
                            <Controller
                                name="color"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Color"
                                        type="color"
                                        fullWidth
                                        error={!!errors.color}
                                        helperText={errors.color?.message}
                                    />
                                )}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button type="submit" variant="contained">Save</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default ShiftTemplateManager;
