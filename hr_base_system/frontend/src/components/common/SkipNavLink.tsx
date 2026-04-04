import React from 'react';
import { Box } from '@mui/material';

const SkipNavLink: React.FC = () => {
  const handleSkip = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.getElementById('main-content');
    if (main) {
      main.focus();
    }
  };

  return (
    <Box
      component="a"
      href="#main-content"
      onClick={handleSkip}
      sx={{
        position: 'absolute',
        left: '-999px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        zIndex: (theme) => theme.zIndex.tooltip + 1,
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        px: 2,
        py: 1,
        borderRadius: 1,
        boxShadow: 3,
        fontWeight: 600,
        ':focus': {
          left: '50%',
          top: 16,
          width: 'auto',
          height: 'auto',
          transform: 'translateX(-50%)',
          overflow: 'visible',
        },
      }}
    >
      Skip to main content
    </Box>
  );
};

export default SkipNavLink;
