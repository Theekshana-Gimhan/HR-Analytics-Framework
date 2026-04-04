import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
    FormControlLabel,
    Switch
} from '@mui/material';
import {
    useCreateUser,
    useUpdateUser,
} from '../../../lib/api/hooks';
import { User, CreateUserInput, UpdateUserInput } from '../../../lib/api';
import useFeedback from '../../../hooks/useFeedback';
import { getErrorMessage } from '../../../lib/apiClient';


const userSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
    role: z.enum(['ADMIN', 'OWNER', 'EMPLOYEE']),
    isActive: z.boolean().optional(),
    employeeId: z.number().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
    open: boolean;
    onClose: () => void;
    user?: User | null;
}

const UserForm: React.FC<UserFormProps> = ({ open, onClose, user }) => {
    const isEdit = !!user;

    const { control, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            email: '',
            password: '',
            role: 'EMPLOYEE',
            isActive: true,
        },
    });

    useEffect(() => {
        if (user) {
            reset({
                email: user.email,
                role: user.role as 'ADMIN' | 'OWNER' | 'EMPLOYEE',
                isActive: user.isActive,
                password: '',
            });
        } else {
            reset({
                email: '',
                password: '',
                role: 'EMPLOYEE',
                isActive: true,
            });
        }
    }, [user, reset]);

    const { notifyError, notifySuccess } = useFeedback();
    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();

    const onSubmit = (data: UserFormData) => {
        if (isEdit && user) {
            const updateData: UpdateUserInput = {
                email: data.email,
                role: data.role,
                isActive: data.isActive,
            };
            updateMutation.mutate(
                { id: user.id, data: updateData },
                {
                    onSuccess: () => {
                        notifySuccess('User updated successfully');
                        onClose();
                    },
                    onError: (error) => {
                        notifyError(getErrorMessage(error));
                    },
                }
            );
        } else {
            const createData: CreateUserInput = {
                email: data.email,
                password: data.password || 'DefaultPass123!',
                role: data.role,
                employeeId: data.employeeId,
            };
            createMutation.mutate(createData, {
                onSuccess: () => {
                    notifySuccess('User created successfully');
                    onClose();
                },
                onError: (error) => {
                    notifyError(getErrorMessage(error));
                },
            });
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;


    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? 'Edit User' : 'Create User'}</DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent>
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Email"
                                fullWidth
                                margin="normal"
                                error={!!errors.email}
                                helperText={errors.email?.message}
                            />
                        )}
                    />
                    {!isEdit && (
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Password"
                                    type="password"
                                    fullWidth
                                    margin="normal"
                                    error={!!errors.password}
                                    helperText={errors.password?.message}
                                />
                            )}
                        />
                    )}
                    <Controller
                        name="role"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="role-label">Role</InputLabel>
                                <Select {...field} label="Role" labelId="role-label">
                                    <MenuItem value="ADMIN">Admin</MenuItem>
                                    <MenuItem value="OWNER">Owner</MenuItem>
                                    <MenuItem value="EMPLOYEE">Employee</MenuItem>
                                </Select>
                            </FormControl>
                        )}
                    />
                    {isEdit && (
                        <Controller
                            name="isActive"
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={<Switch checked={field.value} onChange={field.onChange} />}
                                    label="Active"
                                />
                            )}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" loading={isPending}>
                        {isEdit ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default UserForm;
