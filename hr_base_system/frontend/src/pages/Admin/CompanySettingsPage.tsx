import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Divider,
    Grid,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useCompanySettings, useUpdateCompanySettings } from '../../lib/api/hooks';
import useFeedback from '../../hooks/useFeedback';
import { getErrorMessage } from '../../lib/apiClient';

const companySchema = z.object({
    name: z.string().min(1, 'Company name is required'),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const CompanySettingsPage: React.FC = () => {
    const { notifyError, notifySuccess } = useFeedback();

    const { data: settings, isLoading: loading } = useCompanySettings();
    const updateMutation = useUpdateCompanySettings();

    const { control, handleSubmit, reset } = useForm<CompanyFormValues>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            name: '',
            address: '',
            phone: '',
            email: '',
            website: '',
            registrationNumber: '',
            taxId: '',
            country: '',
            currency: '',
        },
    });

    useEffect(() => {
        if (settings) {
            reset({
                name: settings.name,
                address: settings.address || '',
                phone: settings.phone || '',
                email: settings.email || '',
                website: settings.website || '',
                registrationNumber: settings.registrationNumber || '',
                taxId: settings.taxId || '',
                country: settings.country || '',
                currency: settings.currency || '',
            });
        }
    }, [settings, reset]);

    const onSubmit = (data: CompanyFormValues) => {
        updateMutation.mutate(data, {
            onSuccess: () => {
                notifySuccess('Settings updated successfully');
            },
            onError: (error) => {
                notifyError(getErrorMessage(error));
            },
        });
    };

    const saving = updateMutation.isPending;

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                Company Settings
            </Typography>

            <Paper elevation={2} sx={{ p: 4, mt: 2 }}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Grid container spacing={3}>
                        {/* General Information */}
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h6" gutterBottom>
                                General Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        label="Company Name"
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="website"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        label="Website"
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                        </Grid>

                        {/* Contact Details */}
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                Contact Details
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        label="Phone Number"
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="email"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        label="Email Address"
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Controller
                                name="address"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        label="Address"
                                        multiline
                                        rows={3}
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="country"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        label="Country"
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                        </Grid>

                        {/* Legal Information */}
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                Legal & Financial
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="registrationNumber"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        label="Business Registration Number"
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="taxId"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        label="Tax ID / VAT Number"
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Controller
                                name="currency"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        label="Default Currency (e.g. LKR)"
                                        fullWidth
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                startIcon={<SaveIcon />}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
        </Box>
    );
};

export default CompanySettingsPage;
