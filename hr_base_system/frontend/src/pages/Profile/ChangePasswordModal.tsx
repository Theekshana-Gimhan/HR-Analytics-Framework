import React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Stack,
    CircularProgress,
    Alert,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usersApi } from '../../lib/api';
import { useMutation } from '@tanstack/react-query';
import useFeedback from '../../hooks/useFeedback';

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface ChangePasswordModalProps {
    open: boolean;
    handleClose: () => void;
    onSuccess: () => void;
}

const ChangePasswordModal = ({ open, handleClose, onSuccess }: ChangePasswordModalProps) => {
    const { notifySuccess, notifyError } = useFeedback();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
    });

    const mutation = useMutation({
        mutationFn: (data: PasswordFormValues) =>
            usersApi.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            }),
        onSuccess: () => {
            notifySuccess('Password changed successfully');
            reset();
            onSuccess();
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } } | undefined;
            notifyError(err?.response?.data?.message || 'Failed to change password');
        },
    });

    const onSubmit = (data: PasswordFormValues) => {
        mutation.mutate(data);
    };

    const handleCancel = () => {
        reset();
        handleClose();
    };

    return (
        <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
            <DialogTitle>Change Password</DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Ensure your new password is at least 8 characters long and secure.
                        </Alert>

                        <TextField
                            label="Current Password"
                            type="password"
                            fullWidth
                            {...register('currentPassword')}
                            error={!!errors.currentPassword}
                            helperText={errors.currentPassword?.message}
                        />
                        <TextField
                            label="New Password"
                            type="password"
                            fullWidth
                            {...register('newPassword')}
                            error={!!errors.newPassword}
                            helperText={errors.newPassword?.message}
                        />
                        <TextField
                            label="Confirm New Password"
                            type="password"
                            fullWidth
                            {...register('confirmPassword')}
                            error={!!errors.confirmPassword}
                            helperText={errors.confirmPassword?.message}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? <CircularProgress size={24} /> : 'Change Password'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ChangePasswordModal;
