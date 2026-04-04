import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ServerErrorPageProps {
  errorCode?: number;
  errorMessage?: string;
  onRetry?: () => void;
}

const ServerErrorPage: React.FC<ServerErrorPageProps> = ({ 
  errorCode = 500, 
  errorMessage,
  onRetry 
}) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 25% 25%, #fff2f2 0, #fff8f0 40%, #ffffff 80%)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: '50%',
          bgcolor: 'error.light',
          opacity: 0.18,
          filter: 'blur(34px)',
          top: -70,
          right: -60,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          bgcolor: 'warning.light',
          opacity: 0.15,
          filter: 'blur(30px)',
          bottom: -50,
          left: -70,
        }}
      />
      <Paper
        elevation={8}
        sx={{
          maxWidth: 560,
          width: '100%',
          p: { xs: 4, sm: 5 },
          borderRadius: 4,
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: (theme) => theme.shadows[8],
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Chip label="Something went wrong" color="error" variant="outlined" size="small" />
          <ErrorOutlineIcon 
            sx={{ 
              fontSize: 80, 
              color: 'error.main',
            }} 
          />
          
          <Typography 
            variant="h2" 
            fontWeight={800} 
            sx={{ 
              color: 'error.main',
              lineHeight: 1,
            }}
          >
            {errorCode}
          </Typography>
          
          <Stack spacing={1}>
            <Typography variant="h5" fontWeight={700}>
              {errorCode === 500 ? 'Internal Server Error' : 'Server Error'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {errorMessage || 'Something went wrong on our end. Please try again later.'}
            </Typography>
          </Stack>

          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            sx={{ width: '100%', maxWidth: 320 }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              fullWidth
            >
              Try Again
            </Button>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              startIcon={<HomeIcon />}
              fullWidth
            >
              Go to Dashboard
            </Button>
          </Stack>

          <Typography variant="caption" color="text.disabled">
            If the problem persists, contact support@simpala.lk with this timestamp: {new Date().toISOString()}.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ServerErrorPage;
