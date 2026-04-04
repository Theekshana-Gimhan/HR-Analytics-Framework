import React from 'react';
import AppThemeProvider from './AppThemeProvider';
import FeedbackProvider from './FeedbackProvider';
import QueryProvider from './QueryProvider';

type AppProvidersProps = {
  children: React.ReactNode;
};

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryProvider>
      <AppThemeProvider>
        <FeedbackProvider>{children}</FeedbackProvider>
      </AppThemeProvider>
    </QueryProvider>
  );
};

export default AppProviders;
