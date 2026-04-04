import { useState, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import apiClient from '../lib/apiClient';

interface Credential {
  id: number;
  friendlyName: string | null;
  credentialDeviceType: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface UseWebAuthnReturn {
  credentials: Credential[];
  loading: boolean;
  status: { type: 'success' | 'error' | 'info'; message: string } | null;
  fetchCredentials: () => Promise<void>;
  registerPasskey: (friendlyName: string) => Promise<void>;
  authenticatePasskey: () => Promise<void>;
  deleteCredential: (id: number) => Promise<void>;
  clearStatus: () => void;
}

export const useWebAuthn = (): UseWebAuthnReturn => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const clearStatus = useCallback(() => setStatus(null), []);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/auth/webauthn/credentials');
      setCredentials(response.data.credentials || []);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Failed to fetch credentials:', err);
      // Silent failure for fetch to avoid blocking UI
    } finally {
      setLoading(false);
    }
  }, []);

  const registerPasskey = useCallback(async (friendlyName: string) => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Starting registration...' });

    try {
      // 1. Get options from server
      const optionsResponse = await apiClient.get('/auth/webauthn/register/options');
      const options = optionsResponse.data;

      setStatus({ type: 'info', message: 'Please complete biometric verification...' });
      
      // 2. Pass options to browser API
      const attResp = await startRegistration({ optionsJSON: options });

      // 3. Verify with server
      await apiClient.post('/auth/webauthn/register/verify', {
        response: attResp,
        friendlyName,
      });

      setStatus({ type: 'success', message: '✅ Passkey registered successfully!' });
      await fetchCredentials();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error('Registration error:', error);
      setStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Registration failed',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchCredentials]);

  const authenticatePasskey = useCallback(async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Starting authentication...' });

    try {
      // 1. Get options from server
      const optionsResponse = await apiClient.get('/auth/webauthn/authenticate/options');
      const options = optionsResponse.data;

      setStatus({ type: 'info', message: 'Please complete biometric verification...' });

      // 2. Pass options to browser API
      const authResp = await startAuthentication({ optionsJSON: options });

      // 3. Verify with server
      const verifyResponse = await apiClient.post('/auth/webauthn/authenticate/verify', {
        response: authResp,
      });

      setStatus({
        type: 'success',
        message: `✅ Authentication successful! User: ${verifyResponse.data.user?.email || 'Unknown'}`,
      });
      
      // Return token if needed by caller
      return verifyResponse.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error('Authentication error:', error);
      setStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Authentication failed',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCredential = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await apiClient.delete(`/auth/webauthn/credentials/${id}`);
      setStatus({ type: 'success', message: 'Passkey deleted successfully' });
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setStatus({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete passkey',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    credentials,
    loading,
    status,
    fetchCredentials,
    registerPasskey,
    authenticatePasskey,
    deleteCredential,
    clearStatus,
  };
};
