import React, { useState } from 'react';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useUsers, useDeleteUser } from '../../../lib/api/hooks';
import { User } from '../../../lib/api';
import {
    Button,
    IconButton,
    Box,
    Typography,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import useFeedback from '../../../hooks/useFeedback';
import { getErrorMessage } from '../../../lib/apiClient';

interface UserListProps {
    onEdit: (user: User) => void;
    onCreate: () => void;
}

const UserList: React.FC<UserListProps> = ({ onEdit, onCreate }) => {
    const { notifyError, notifySuccess } = useFeedback();
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<number | null>(null);

    const { data, isLoading } = useUsers({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
    });

    const deleteMutation = useDeleteUser();


    const handleDeleteClick = (id: number) => {
        setUserToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (userToDelete) {
            deleteMutation.mutate(userToDelete, {
                onSuccess: () => {
                    notifySuccess('User deactivated successfully');
                    setDeleteConfirmOpen(false);
                },
                onError: (error) => {
                    notifyError(getErrorMessage(error));
                }
            });
        }
    };

    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'role', headerName: 'Role', width: 130 },
        {
            field: 'isActive',
            headerName: 'Status',
            width: 130,
            renderCell: (params) => (
                <Chip
                    label={params.value ? 'Active' : 'Inactive'}
                    color={params.value ? 'success' : 'default'}
                    size="small"
                />
            ),
        },
        {
            field: 'name',
            headerName: 'Employee Name',
            width: 200,
            valueGetter: (params, row) => {
                if (row.employee) {
                    return `${row.employee.first_name} ${row.employee.last_name}`;
                }
                return '-';
            },
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
                <Box>
                    <IconButton onClick={() => onEdit(params.row)} size="small">
                        <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteClick(params.row.id)} size="small" color="error">
                        <DeleteIcon />
                    </IconButton>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ height: 400, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Users</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
                    Create User
                </Button>
            </Box>
            <DataGrid
                rows={data?.data || []}
                columns={columns}
                rowCount={data?.total || 0}
                loading={isLoading}
                pageSizeOptions={[5, 10, 20]}
                paginationModel={paginationModel}
                paginationMode="server"
                onPaginationModelChange={setPaginationModel}
            />

            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Confirm Deactivate</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to deactivate this user? They will no longer be able to login.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={confirmDelete} color="error" autoFocus>
                        Deactivate
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserList;
