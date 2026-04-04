import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Box, Snackbar } from '@mui/material';
import FeedbackContext, {
  type FeedbackContextValue,
  type FeedbackMessage,
  type NotifyOptions,
} from './feedbackContext';

const DEFAULT_AUTO_HIDE = 4500;

const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const counterRef = useRef(0);

  const generateId = useCallback(() => {
    counterRef.current += 1;
    return `${Date.now()}-${counterRef.current}`;
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const notify = useCallback(
    ({ message, severity = 'info', autoHideDuration = DEFAULT_AUTO_HIDE }: NotifyOptions) => {
      const id = generateId();

      setMessages((prev) => [
        ...prev,
        {
          id,
          message,
          severity,
          autoHideDuration,
        },
      ]);

      return id;
    },
    [generateId]
  );

  const dismiss = useCallback((id: string) => {
    removeMessage(id);
  }, [removeMessage]);

  const dismissAll = useCallback(() => {
    setMessages([]);
  }, []);

  const contextValue = useMemo<FeedbackContextValue>(
    () => ({
      notify,
      notifySuccess: (message, options) =>
        notify({ message, severity: 'success', autoHideDuration: options?.autoHideDuration }),
      notifyError: (message, options) =>
        notify({ message, severity: 'error', autoHideDuration: options?.autoHideDuration }),
      notifyInfo: (message, options) =>
        notify({ message, severity: 'info', autoHideDuration: options?.autoHideDuration }),
      notifyWarning: (message, options) =>
        notify({ message, severity: 'warning', autoHideDuration: options?.autoHideDuration }),
      dismiss,
      dismissAll,
    }),
    [dismiss, notify]
  );

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          zIndex: (theme) => theme.zIndex.snackbar,
          pointerEvents: 'none',
        }}
      >
        {messages.map((message) => (
          <Snackbar
            key={message.id}
            open
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            autoHideDuration={message.autoHideDuration}
            onClose={(_, reason) => {
              if (reason === 'clickaway') {
                return;
              }
              removeMessage(message.id);
            }}
            TransitionProps={{
              onExited: () => removeMessage(message.id),
            }}
            sx={{ pointerEvents: 'auto' }}
          >
            <Alert
              severity={message.severity}
              onClose={() => removeMessage(message.id)}
              variant="filled"
              elevation={3}
            >
              {message.message}
            </Alert>
          </Snackbar>
        ))}
      </Box>
    </FeedbackContext.Provider>
  );
};

export default FeedbackProvider;

export type { FeedbackContextValue, FeedbackMessage, NotifyOptions } from './feedbackContext';
