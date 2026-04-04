import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardHeader,
    CardContent,
    Typography,
    Alert,
    TextField,
    Stack,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Chip,
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControlLabel,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SecurityIcon from '@mui/icons-material/Security';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useWebAuthn } from '../../hooks/useWebAuthn';

const SecurityPage: React.FC = () => {
    const theme = useTheme();
    const {
        credentials,
        loading,
        status,
        fetchCredentials,
        registerPasskey,
        deleteCredential,
        clearStatus
    } = useWebAuthn();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newPasskeyName, setNewPasskeyName] = useState('');

    useEffect(() => {
        fetchCredentials();
    }, [fetchCredentials]);

    const handleAddPasskey = async () => {
        if (!newPasskeyName.trim()) return;
        await registerPasskey(newPasskeyName);
        setIsAddDialogOpen(false);
        setNewPasskeyName('');
    };

    const getDeviceIcon = () => {
        // Basic heuristic: 'platform' usually implies built-in biometric (Laptop/Phone)
        // 'cross-platform' usually implies external key (YubiKey)
        // For now, defaulting to fingerprint for visual consistency with design
        return <FingerprintIcon color="primary" />;
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
            <Stack spacing={3}>
                {/* Header Section */}
                <Box textAlign="center" mb={4}>
                    <SecurityIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        Secure Your Account
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Add an extra layer of security effectively. Use your fingerprint, Face ID, or a hardware key.
                    </Typography>
                </Box>

                {status && (
                    <Alert
                        severity={status.type}
                        onClose={clearStatus}
                        sx={{ mb: 2 }}
                    >
                        {status.message}
                    </Alert>
                )}

                {/* Passkeys Section */}
                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                    <CardHeader
                        title="Passkeys"
                        subheader="Passkeys allow you to sign in safely without a password."
                        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
                    />
                    <Divider />
                    <CardContent>
                        <List disablePadding>
                            {credentials.map((cred) => (
                                <ListItem
                                    key={cred.id}
                                    sx={{
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 2,
                                        mb: 2,
                                        '&:last-child': { mb: 0 },
                                    }}
                                    secondaryAction={
                                        <IconButton
                                            edge="end"
                                            aria-label="delete"
                                            onClick={() => {
                                                if (window.confirm('Delete this passkey?')) {
                                                    deleteCredential(cred.id);
                                                }
                                            }}
                                            color="error"
                                        >
                                            <DeleteOutlineIcon />
                                        </IconButton>
                                    }
                                >
                                    <ListItemIcon>
                                        {getDeviceIcon()}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {cred.friendlyName || 'Unnamed Device'}
                                                </Typography>
                                                <Chip
                                                    label={cred.credentialDeviceType === 'multiDevice' ? 'Synced' : 'Device-bound'}
                                                    size="small"
                                                    variant="outlined"
                                                    color={cred.credentialDeviceType === 'multiDevice' ? 'info' : 'default'}
                                                />
                                            </Stack>
                                        }
                                        secondary={`Added on ${new Date(cred.createdAt).toLocaleDateString()}`}
                                    />
                                </ListItem>
                            ))}

                            {credentials.length === 0 && !loading && (
                                <Typography variant="body2" color="text.secondary" align="center" py={4}>
                                    No passkeys registered. Add one to get started.
                                </Typography>
                            )}
                        </List>

                        <Box mt={3}>
                            <Button
                                variant="contained"
                                size="large"
                                fullWidth
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={() => setIsAddDialogOpen(true)}
                                disabled={loading}
                            >
                                Add New Passkey
                            </Button>
                        </Box>
                    </CardContent>
                </Card>

                {/* Two-Factor Auth Section (Placeholder) */}
                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography variant="h6" fontWeight={600}>
                                    Two-Factor Auth (Authenticator App)
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Secure your account with TOTP apps like Google Authenticator.
                                </Typography>
                            </Box>
                            <FormControlLabel
                                control={<Switch disabled />} // Disabled for now as per requirements
                                label="Off"
                                labelPlacement="start"
                            />
                        </Stack>
                    </CardContent>
                </Card>

            </Stack>

            {/* Add Passkey Dialog */}
            <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
                <DialogTitle>Name your Passkey</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Give this device a name so you can identify it later (e.g., "MacBook Pro", "iPhone 15").
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Device Name"
                        fullWidth
                        variant="outlined"
                        value={newPasskeyName}
                        onChange={(e) => setNewPasskeyName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAddDialogOpen(false)} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleAddPasskey} variant="contained" disabled={!newPasskeyName.trim()}>
                        Continue
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SecurityPage;
