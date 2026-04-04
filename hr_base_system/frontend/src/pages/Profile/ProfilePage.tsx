import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    Stack,
    Typography,
    Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../lib/api';
import ProfileForm from './ProfileForm';
import ChangePasswordModal from './ChangePasswordModal';

const ProfilePage = () => {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);

    const {
        data: profile,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['profile'],
        queryFn: usersApi.getProfile,
    });

    const handleEditSuccess = () => {
        setIsEditOpen(false);
        refetch();
    };

    const handlePasswordSuccess = () => {
        setIsPasswordOpen(false);
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error">
                Failed to load profile. Please try again later.
            </Alert>
        );
    }

    if (!profile) return null;

    const employee = profile.employee;

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    My Profile
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage your personal information and account security.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Profile Card */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 2,
                                }}
                            >
                                <PersonIcon fontSize="large" />
                            </Box>
                            <Typography variant="h6" fontWeight={600}>
                                {employee ? `${employee.first_name} ${employee.last_name}` : profile.email}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {employee?.job_title || profile.role}
                            </Typography>
                            {employee?.department && (
                                <Chip label={employee.department} size="small" sx={{ mt: 1 }} />
                            )}
                        </CardContent>
                        <Divider />
                        <CardContent>
                            <Stack spacing={2}>
                                <Button
                                    variant="outlined"
                                    startIcon={<EditIcon />}
                                    fullWidth
                                    onClick={() => setIsEditOpen(true)}
                                    disabled={!employee}
                                >
                                    Edit Profile
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    startIcon={<LockIcon />}
                                    fullWidth
                                    onClick={() => setIsPasswordOpen(true)}
                                >
                                    Change Password
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Details Card */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card>
                        <CardHeader title="Personal Information" />
                        <Divider />
                        <CardContent>
                            <Stack spacing={3}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Email Address
                                        </Typography>
                                        <Typography variant="body1">{profile.email}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Role
                                        </Typography>
                                        <Typography variant="body1">{profile.role}</Typography>
                                    </Grid>
                                    {employee && (
                                        <>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Phone Number
                                                </Typography>
                                                <Typography variant="body1">
                                                    {employee.phone_number || 'Not provided'}
                                                </Typography>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    NIC
                                                </Typography>
                                                <Typography variant="body1">
                                                    {employee.nic || 'Not provided'}
                                                </Typography>
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Address
                                                </Typography>
                                                <Typography variant="body1">
                                                    {employee.address || 'Not provided'}
                                                </Typography>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Date of Birth
                                                </Typography>
                                                <Typography variant="body1">
                                                    {employee.date_of_birth
                                                        ? new Date(employee.date_of_birth).toLocaleDateString()
                                                        : 'Not provided'}
                                                </Typography>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Hire Date
                                                </Typography>
                                                <Typography variant="body1">
                                                    {employee.hire_date
                                                        ? new Date(employee.hire_date).toLocaleDateString()
                                                        : 'Not provided'}
                                                </Typography>
                                            </Grid>
                                        </>
                                    )}
                                </Grid>

                                {employee && (
                                    <>
                                        <Divider />
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            Bank Details
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Bank Name
                                                </Typography>
                                                <Typography variant="body1">
                                                    {employee.bank_name || 'Not provided'}
                                                </Typography>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Branch
                                                </Typography>
                                                <Typography variant="body1">
                                                    {employee.bank_branch || 'Not provided'}
                                                </Typography>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Account Number
                                                </Typography>
                                                <Typography variant="body1">
                                                    {employee.account_number || 'Not provided'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Forms */}
            {employee && (
                <ProfileForm
                    open={isEditOpen}
                    handleClose={() => setIsEditOpen(false)}
                    onSuccess={handleEditSuccess}
                    initialData={employee}
                />
            )}

            <ChangePasswordModal
                open={isPasswordOpen}
                handleClose={() => setIsPasswordOpen(false)}
                onSuccess={handlePasswordSuccess}
            />
        </Stack>
    );
};

export default ProfilePage;
