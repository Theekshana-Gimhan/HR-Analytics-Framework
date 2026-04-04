import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Divider, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { startAuthentication } from '@simplewebauthn/browser';
import apiClient from '../../lib/apiClient';
import { persistSession } from '../../lib/auth';
import useFeedback from '../../hooks/useFeedback';
import { API_BASE_URL } from '../../config/constants';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();
  const { notifyError, notifySuccess, notifyInfo } = useFeedback();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const { token, accessToken, refreshToken, user } = response.data ?? {};
      const sessionToken = token ?? accessToken;

      if (sessionToken) {
        persistSession(sessionToken, user?.role, user?.companyId, refreshToken);
        notifySuccess('Signed in successfully.');
        navigate('/');
      } else {
        notifyError('Unexpected response from server. Please try again.');
      }
    } catch (err) {
      console.error('Login failed', err);
      notifyError('Login failed. Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true);
    notifyInfo('Starting passkey authentication...');

    try {
      // 1. Get authentication options
      const optionsRes = await fetch(`${API_BASE_URL}/auth/webauthn/authenticate/options`);
      if (!optionsRes.ok) {
        throw new Error('Failed to get authentication options');
      }
      const options = await optionsRes.json();

      // 2. Start WebAuthn authentication (browser prompt)
      const authResp = await startAuthentication({ optionsJSON: options });

      // 3. Verify with server
      const verifyRes = await fetch(`${API_BASE_URL}/auth/webauthn/authenticate/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResp }),
      });

      if (!verifyRes.ok) {
        const error = await verifyRes.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const result = await verifyRes.json();
      const { token, accessToken, refreshToken, user } = result;
      const sessionToken = token ?? accessToken;

      if (sessionToken) {
        persistSession(sessionToken, user?.role, user?.companyId, refreshToken);
        notifySuccess('Signed in with passkey successfully.');
        navigate('/');
      } else {
        notifyError('Unexpected response from server.');
      }
    } catch (err) {
      console.error('Passkey login failed', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          notifyError('Passkey authentication was cancelled.');
        } else {
          notifyError(err.message || 'Passkey login failed.');
        }
      } else {
        notifyError('Passkey login failed.');
      }
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetEmail.trim()) {
      notifyError('Please enter your email address.');
      return;
    }
    setIsResetting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: resetEmail });
      notifySuccess('If an account exists with that email, a password reset link has been sent.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch {
      // Always show success to prevent email enumeration
      notifySuccess('If an account exists with that email, a password reset link has been sent.');
      setShowForgotPassword(false);
      setResetEmail('');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 6, md: 10 },
      }}
    >
      <Paper
        component="form"
        onSubmit={showForgotPassword ? handleForgotPassword : handleLogin}
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 4, md: 6 },
          borderRadius: 4,
        }}
      >
        {showForgotPassword ? (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Reset password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your work email and we&apos;ll send you a reset link.
              </Typography>
            </Box>

            <TextField
              type="email"
              label="Work email"
              value={resetEmail}
              required
              onChange={(e) => setResetEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              size="medium"
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isResetting}
              aria-busy={isResetting}
            >
              {isResetting ? 'Sending…' : 'Send reset link'}
            </Button>

            <Button
              type="button"
              variant="text"
              size="small"
              onClick={() => setShowForgotPassword(false)}
            >
              Back to sign in
            </Button>
          </Stack>
        ) : (
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Welcome back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to access your Simpala HR workspace.
            </Typography>
          </Box>

          <TextField
            type="email"
            label="Work email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            size="medium"
          />

          <TextField
            type="password"
            label="Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            size="medium"
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => setShowForgotPassword(true)}
              underline="hover"
            >
              Forgot password?
            </Link>
          </Box>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading || isPasskeyLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>

          <Divider>
            <Typography variant="body2" color="text.secondary">
              or
            </Typography>
          </Divider>

          <Button
            type="button"
            variant="outlined"
            size="large"
            onClick={handlePasskeyLogin}
            disabled={isLoading || isPasskeyLoading}
            startIcon={<FingerprintIcon />}
            aria-busy={isPasskeyLoading}
          >
            {isPasskeyLoading ? 'Authenticating…' : 'Sign in with Passkey'}
          </Button>
        </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default Login;
