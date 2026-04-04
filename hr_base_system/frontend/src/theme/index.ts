import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563EB', // Blue 600 - More vibrant
      light: '#60A5FA',
      dark: '#1E40AF',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569', // Slate 600 - Neutral secondary
      light: '#94a3b8',
      dark: '#1e293b',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10B981', // Emerald 500
      light: '#D1FAE5',
      dark: '#059669',
    },
    error: {
      main: '#EF4444', // Red 500
      light: '#FEE2E2',
      dark: '#B91C1C',
    },
    warning: {
      main: '#F59E0B', // Amber 500
      light: '#FEF3C7',
      dark: '#D97706',
    },
    info: {
      main: '#3B82F6', // Blue 500
      light: '#DBEAFE',
      dark: '#1D4ED8',
    },
    background: {
      default: '#F8FAFC', // Slate 50
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A', // Slate 900
      secondary: '#64748B', // Slate 500
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
    subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.57 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.57 },
    button: { textTransform: 'none', fontWeight: 600 },
    caption: { fontSize: '0.75rem', lineHeight: 1.66 },
    overline: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '0.5rem 1rem',
          transition: 'all 0.2s ease-in-out',
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#1D4ED8', // Blue 700
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #E2E8F0', // Slate 200
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        title: {
          fontSize: '1.125rem',
          fontWeight: 600,
        },
        subheader: {
          fontSize: '0.875rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: '#E2E8F0', // Slate 200
            },
            '&:hover fieldset': {
              borderColor: '#94A3B8', // Slate 400
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2563EB', // Blue 600
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
          fontWeight: 600,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          backgroundColor: '#F8FAFC',
          scrollBehavior: 'smooth',
          fontFeatureSettings: '"cv11", "ss01"',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },
  },
});

export default theme;
