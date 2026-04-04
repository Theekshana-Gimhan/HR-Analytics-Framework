import React, { useEffect } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    TextField,
    CircularProgress,
    Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usersApi, Employee } from '../../lib/api';
import { useMutation } from '@tanstack/react-query';
import useFeedback from '../../hooks/useFeedback';

// Schema for updating profile (subset of employee fields)
const profileSchema = z.object({
    phone: z.string().min(1, 'Phone number is required'),
    address: z.string().min(1, 'Address is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    bankName: z.string().optional(),
    bankBranch: z.string().optional(),
    accountNumber: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
    open: boolean;
    handleClose: () => void;
    onSuccess: () => void;
    initialData: Employee;
}

const ProfileForm = ({ open, handleClose, onSuccess, initialData }: ProfileFormProps) => {
    const { notifySuccess, notifyError } = useFeedback();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            phone: initialData.phone_number || '',
            address: initialData.address || '',
            dateOfBirth: initialData.date_of_birth
                ? new Date(initialData.date_of_birth).toISOString().split('T')[0]
                : '',
            bankName: initialData.bank_name || '',
            bankBranch: initialData.bank_branch || '',
            accountNumber: initialData.account_number || '',
            emergencyContactName: initialData.emergency_contact_name || '',
            emergencyContactPhone: initialData.emergency_contact_phone || '',
        },
    });

    // Reset form when opening with new data
    useEffect(() => {
        if (open) {
            reset({
                phone: initialData.phone_number || '',
                address: initialData.address || '',
                dateOfBirth: initialData.date_of_birth
                    ? new Date(initialData.date_of_birth).toISOString().split('T')[0]
                    : '',
                bankName: initialData.bank_name || '',
                bankBranch: initialData.bank_branch || '',
                accountNumber: initialData.account_number || '',
                emergencyContactName: initialData.emergency_contact_name || '',
                emergencyContactPhone: initialData.emergency_contact_phone || '',
            });
        }
    }, [open, initialData, reset]);

    const mutation = useMutation({
        mutationFn: (data: ProfileFormValues) =>
            usersApi.updateProfile({
                phone: data.phone,
                address: data.address,
                date_of_birth: data.dateOfBirth,
                bank_name: data.bankName,
                bank_branch: data.bankBranch,
                account_number: data.accountNumber,
                emergency_contact_name: data.emergencyContactName,
                emergency_contact_phone: data.emergencyContactPhone,
            }),
        onSuccess: () => {
            notifySuccess('Profile updated successfully');
            onSuccess();
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } } | undefined;
            notifyError(err?.response?.data?.message || 'Failed to update profile');
        },
    });

    const onSubmit = (data: ProfileFormValues) => {
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Profile</DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="Phone Number"
                                fullWidth
                                {...register('phone')}
                                error={!!errors.phone}
                                helperText={errors.phone?.message}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="Address"
                                fullWidth
                                multiline
                                rows={3}
                                {...register('address')}
                                error={!!errors.address}
                                helperText={errors.address?.message}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="Date of Birth"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                {...register('dateOfBirth')}
                                error={!!errors.dateOfBirth}
                                helperText={errors.dateOfBirth?.message}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
                                Bank Details
                            </Typography>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="Bank Name"
                                fullWidth
                                {...register('bankName')}
                                error={!!errors.bankName}
                                helperText={errors.bankName?.message}
                            />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <TextField
                                label="Branch"
                                fullWidth
                                {...register('bankBranch')}
                                error={!!errors.bankBranch}
                                helperText={errors.bankBranch?.message}
                            />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <TextField
                                label="Account Number"
                                fullWidth
                                {...register('accountNumber')}
                                error={!!errors.accountNumber}
                                helperText={errors.accountNumber?.message}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
                                Emergency Contact
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Emergency Contact Name"
                                fullWidth
                                {...register('emergencyContactName')}
                                error={!!errors.emergencyContactName}
                                helperText={errors.emergencyContactName?.message}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Emergency Contact Phone"
                                fullWidth
                                {...register('emergencyContactPhone')}
                                error={!!errors.emergencyContactPhone}
                                helperText={errors.emergencyContactPhone?.message}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? <CircularProgress size={24} /> : 'Save Changes'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ProfileForm;
