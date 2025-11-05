import { createTheme } from '@mui/material/styles';

// TutorAI Admin Dashboard Theme
// iOS-inspired design with blue primary color (matching mobile app)
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#007AFF', // iOS blue (matches mobile app buttons)
      light: '#4da2ff',
      dark: '#0055b3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1DB954', // Spotify green (accent color)
      light: '#1ed760',
      dark: '#169c46',
      contrastText: '#ffffff',
    },
    error: {
      main: '#FF3B30',
      light: '#ff6659',
      dark: '#c62828',
    },
    warning: {
      main: '#FF9F0A',
      light: '#ffb23c',
      dark: '#c67900',
    },
    success: {
      main: '#34C759',
      light: '#5dd47a',
      dark: '#28a745',
    },
    background: {
      default: '#F0F2F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1C1C1E',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    button: {
      textTransform: 'none', // Keep button text as-is (not uppercase)
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12, // Rounded corners throughout
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default gradient
        },
      },
    },
  },
});

export default theme;

