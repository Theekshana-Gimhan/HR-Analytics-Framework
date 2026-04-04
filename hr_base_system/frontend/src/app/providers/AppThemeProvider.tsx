import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../../theme';

type AppThemeProviderProps = {
  children: React.ReactNode;
};

const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default AppThemeProvider;
