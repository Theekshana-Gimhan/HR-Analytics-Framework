import React, { useState, useEffect, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Alert,
    TextField,
    Stack,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Chip,
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AUTH_TOKEN_KEY, API_BASE_URL } from '../../config/constants';

interface Credential {
    id: number;
    friendlyName: string | null;
    credentialDeviceType: string;
    createdAt: string;
    lastUsedAt: string | null;
}

interface WebAuthnTestPageProps {
    standalone?: boolean;
}

/**
 * WebAuthn POC Test Page
 * 
 * Demonstrates biometric/passkey authentication:
 * 1. Register a passkey (requires login)
 * 2. Authenticate with passkey (passwordless login)
 */
export const WebAuthnTestPage: React.FC<WebAuthnTestPageProps> = () => {
    const [token, setToken] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [friendlyName, setFriendlyName] = useState('My Device');
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [loadingCredentials, setLoadingCredentials] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchCredentials = useCallback(async (authToken: string) => {
        setLoadingCredentials(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/webauthn/credentials`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCredentials(data.credentials || []);
            }
        } catch (error) {
            console.error('Failed to fetch credentials:', error);
        } finally {
            setLoadingCredentials(false);
        }
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        setToken(storedToken);
        if (storedToken) {
            fetchCredentials(storedToken);
        }
    }, [fetchCredentials]);

    const handleDeleteCredential = async (credentialId: number, name: string | null) => {
        if (!token) return;
        if (!confirm(`Delete passkey "${name || 'Unnamed'}"? This cannot be undone.`)) return;

        setDeletingId(credentialId);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/webauthn/credentials/${credentialId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                throw new Error((await res.json()).message || 'Delete failed');
            }

            setCredentials((prev) => prev.filter((c) => c.id !== credentialId));
            setStatus({ type: 'success', message: `Passkey "${name || 'Unnamed'}" deleted successfully` });
        } catch (error) {
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to delete passkey',
            });
        } finally {
            setDeletingId(null);
        }
    };

    const handleRegister = async () => {
        if (!token) {
            setStatus({ type: 'error', message: 'You must be logged in to register a passkey' });
            return;
        }

        setLoading(true);
        setStatus({ type: 'info', message: 'Starting registration...' });

        try {
            const optionsRes = await fetch(`${API_BASE_URL}/auth/webauthn/register/options`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!optionsRes.ok) {
                throw new Error(await optionsRes.text());
            }

            const options = await optionsRes.json();

            setStatus({ type: 'info', message: 'Please complete biometric verification...' });
            const attResp = await startRegistration({ optionsJSON: options });

            const verifyRes = await fetch(`${API_BASE_URL}/auth/webauthn/register/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ response: attResp, friendlyName }),
            });

            if (!verifyRes.ok) {
                throw new Error((await verifyRes.json()).message || 'Registration failed');
            }

            setStatus({ type: 'success', message: '✅ Passkey registered successfully!' });
            // Refresh the credentials list
            if (token) fetchCredentials(token);
        } catch (error) {
            console.error('Registration error:', error);
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Registration failed',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAuthenticate = async () => {
        setLoading(true);
        setStatus({ type: 'info', message: 'Starting authentication...' });

        try {
            const optionsRes = await fetch(`${API_BASE_URL}/auth/webauthn/authenticate/options`);

            if (!optionsRes.ok) {
                throw new Error(await optionsRes.text());
            }

            const options = await optionsRes.json();

            setStatus({ type: 'info', message: 'Please complete biometric verification...' });
            const authResp = await startAuthentication({ optionsJSON: options });

            const verifyRes = await fetch(`${API_BASE_URL}/auth/webauthn/authenticate/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: authResp }),
            });

            if (!verifyRes.ok) {
                throw new Error((await verifyRes.json()).message || 'Authentication failed');
            }

            const result = await verifyRes.json();
            setStatus({
                type: 'success',
                message: `✅ Authentication successful! User: ${result.user?.email || 'Unknown'}`,
            });

            console.log('Auth result:', result);
        } catch (error) {
            console.error('Authentication error:', error);
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Authentication failed',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
            <Card elevation={3}>
                <CardContent>
                    <Stack spacing={3} alignItems="center">
                        <FingerprintIcon sx={{ fontSize: 64, color: 'primary.main' }} />
                        <Typography variant="h4" component="h1" align="center">
                            WebAuthn POC
                        </Typography>
                        <Typography variant="body1" color="text.secondary" align="center">
                            Test biometric/passkey authentication (FaceID, TouchID, Windows Hello)
                        </Typography>

                        {status && (
                            <Alert severity={status.type} sx={{ width: '100%' }}>
                                {status.message}
                            </Alert>
                        )}

                        {token && (
                            <Alert severity="info" sx={{ width: '100%' }}>
                                Logged in (token present)
                            </Alert>
                        )}

                        <TextField
                            label="Passkey Name"
                            value={friendlyName}
                            onChange={(e) => setFriendlyName(e.target.value)}
                            fullWidth
                            disabled={loading}
                            helperText="Give your passkey a friendly name (e.g., 'MacBook TouchID')"
                        />

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleRegister}
                                disabled={loading || !token}
                                fullWidth
                                startIcon={loading ? <CircularProgress size={20} /> : <FingerprintIcon />}
                            >
                                Register Passkey
                            </Button>

                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={handleAuthenticate}
                                disabled={loading}
                                fullWidth
                                startIcon={loading ? <CircularProgress size={20} /> : <FingerprintIcon />}
                            >
                                Login with Passkey
                            </Button>
                        </Stack>

                        <Typography variant="caption" color="text.secondary" align="center">
                            Registration requires an existing login. Authentication works without prior login.
                        </Typography>

                        {/* Registered Passkeys Section */}
                        {token && (
                            <>
                                <Divider sx={{ width: '100%' }} />
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                                    <Typography variant="h6">
                                        Registered Passkeys
                                    </Typography>
                                    <IconButton
                                        onClick={() => token && fetchCredentials(token)}
                                        disabled={loadingCredentials}
                                        size="small"
                                        title="Refresh"
                                    >
                                        {loadingCredentials ? <CircularProgress size={20} /> : <RefreshIcon />}
                                    </IconButton>
                                </Stack>

                                {credentials.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ width: '100%' }}>
                                        No passkeys registered yet. Register one above.
                                    </Typography>
                                ) : (
                                    <List sx={{ width: '100%' }}>
                                        {credentials.map((cred) => (
                                            <ListItem
                                                key={cred.id}
                                                sx={{
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    mb: 1,
                                                }}
                                                secondaryAction={
                                                    <IconButton
                                                        edge="end"
                                                        aria-label="delete"
                                                        onClick={() => handleDeleteCredential(cred.id, cred.friendlyName)}
                                                        disabled={deletingId === cred.id}
                                                        color="error"
                                                        title="Delete passkey"
                                                    >
                                                        {deletingId === cred.id ? (
                                                            <CircularProgress size={20} />
                                                        ) : (
                                                            <DeleteIcon />
                                                        )}
                                                    </IconButton>
                                                }
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <FingerprintIcon fontSize="small" color="primary" />
                                                            <Typography variant="body1">
                                                                {cred.friendlyName || 'Unnamed Passkey'}
                                                            </Typography>
                                                            <Chip
                                                                label={cred.credentialDeviceType === 'multiDevice' ? 'Synced' : 'Device-bound'}
                                                                size="small"
                                                                color={cred.credentialDeviceType === 'multiDevice' ? 'primary' : 'default'}
                                                                variant="outlined"
                                                            />
                                                        </Stack>
                                                    }
                                                    secondary={
                                                        <>
                                                            Created: {new Date(cred.createdAt).toLocaleDateString()}
                                                            {cred.lastUsedAt && ` • Last used: ${new Date(cred.lastUsedAt).toLocaleDateString()}`}
                                                        </>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
};

export default WebAuthnTestPage;
