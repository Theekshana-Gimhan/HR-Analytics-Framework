import React from 'react';
import type { AlertColor } from '@mui/material';

export type FeedbackMessage = {
  id: string;
  message: string;
  severity: AlertColor;
  autoHideDuration: number;
};

export type NotifyOptions = {
  message: string;
  severity?: AlertColor;
  autoHideDuration?: number;
};

export type FeedbackContextValue = {
  notify: (options: NotifyOptions) => string;
  notifySuccess: (message: string, options?: Omit<NotifyOptions, 'message' | 'severity'>) => string;
  notifyError: (message: string, options?: Omit<NotifyOptions, 'message' | 'severity'>) => string;
  notifyInfo: (message: string, options?: Omit<NotifyOptions, 'message' | 'severity'>) => string;
  notifyWarning: (message: string, options?: Omit<NotifyOptions, 'message' | 'severity'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const FeedbackContext = React.createContext<FeedbackContextValue | undefined>(undefined);

export default FeedbackContext;
