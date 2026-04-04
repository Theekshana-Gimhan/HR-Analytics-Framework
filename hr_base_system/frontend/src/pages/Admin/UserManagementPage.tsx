import React, { useState } from 'react';
import { Box, Typography, Container } from '@mui/material';
import UserList from './UserManagement/UserList';
import UserForm from './UserManagement/UserForm';
import { User } from '../../lib/api';

const UserManagementPage: React.FC = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handleCreate = () => {
        setSelectedUser(null);
        setIsFormOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsFormOpen(true);
    };

    const handleClose = () => {
        setIsFormOpen(false);
        setSelectedUser(null);
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                User Management
            </Typography>
            <Box sx={{ mt: 3, bgcolor: 'background.paper', p: 3, borderRadius: 1, boxShadow: 1 }}>
                <UserList onCreate={handleCreate} onEdit={handleEdit} />
            </Box>
            <UserForm open={isFormOpen} onClose={handleClose} user={selectedUser} />
        </Container>
    );
};

export default UserManagementPage;
