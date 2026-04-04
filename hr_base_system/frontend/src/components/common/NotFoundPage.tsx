import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const NotFoundPage: React.FC = () => {
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
        background: 'radial-gradient(circle at 20% 20%, #eef2ff 0, #f8fbff 40%, #ffffff 80%)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 260,
          height: 260,
          borderRadius: '50%',
          bgcolor: 'primary.light',
          opacity: 0.18,
          filter: 'blur(36px)',
          top: -60,
          right: -80,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          bgcolor: 'secondary.light',
          opacity: 0.15,
          filter: 'blur(32px)',
          bottom: -60,
          left: -50,
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
          <Chip label="Lost your way?" color="primary" variant="outlined" size="small" />
          <Typography 
            variant="h1" 
            fontWeight={800} 
            sx={{ 
              fontSize: { xs: '6rem', sm: '8rem' },
              color: 'primary.main',
              lineHeight: 1,
            }}
          >
            404
          </Typography>
          
          <Stack spacing={1}>
            <Typography variant="h5" fontWeight={700}>
              Page not found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sorry, the page you're looking for doesn't exist or has been moved. Double-check the link or jump back to safety.
            </Typography>
          </Stack>

          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            sx={{ width: '100%', maxWidth: 320 }}
          >
            <Button
              component={RouterLink}
              to="/"
              variant="contained"
              startIcon={<HomeIcon />}
              fullWidth
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => window.history.back()}
              fullWidth
            >
              Go Back
            </Button>
          </Stack>

          <Typography variant="caption" color="text.disabled">
            Need help? Contact support@simpala.lk and include the URL you tried to reach.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default NotFoundPage;
