import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const PageLoader: React.FC = () => {
  return (
    <Box
      aria-live="polite"
      sx={{
        minHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress color="primary" thickness={5} size={48} />
      <Typography variant="body2" color="text.secondary">
        Loading experience…
      </Typography>
    </Box>
  );
};

export default PageLoader;
