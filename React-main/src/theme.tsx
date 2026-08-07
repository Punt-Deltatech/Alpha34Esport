import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5865F9',
      light: '#7289fa',
      dark: '#4752c4',
    },
    error: {
      main: '#f23f42',
    },
    background: {
      default: '#313338',
      paper: '#2b2d31',
    },
    text: {
      primary: '#dbdee1',
      secondary: '#949ba4',
    },
    divider: '#3f4147',
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
});

export default theme;