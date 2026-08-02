import { createTheme, alpha } from '@mui/material/styles';

export const OPERATOR_COLORS = {
  Orange: '#ff7900',
  Africell: '#8e24aa',
  Qcell: '#5b2d8e',
  SierraTel: '#00a3e0',
};

export const STATUS_COLOR = {
  Open: '#f59e0b',
  Investigating: '#3b82f6',
  Escalated: '#ef4444',
  Resolved: '#10b981',
  Closed: '#64748b',
  NEW: '#ef4444',
  UNDER_REVIEW: '#f59e0b',
  ASSIGNED: '#3b82f6',
};

export const SEVERITY_COLOR = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

const common = {
  shape: { borderRadius: 6 }, // Slightly smaller border radius (6px)
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, system-ui, sans-serif',
    fontSize: 14,
    h1: { fontWeight: 700, fontSize: '2.5rem', letterSpacing: '-0.02em', lineHeight: 1.2 },
    h2: { fontWeight: 700, fontSize: '2.0rem', letterSpacing: '-0.02em', lineHeight: 1.2 },
    h3: { fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.01em', lineHeight: 1.3 },
    h4: { fontWeight: 600, fontSize: '1.4rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, fontSize: '1.2rem', letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, fontSize: '1.05rem', letterSpacing: '0em' },
    body1: { fontSize: '0.9rem', lineHeight: 1.5 },
    body2: { fontSize: '0.825rem', lineHeight: 1.4 },
    subtitle1: { fontWeight: 600, fontSize: '0.95rem' },
    subtitle2: { fontWeight: 600, fontSize: '0.85rem' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em', fontSize: '0.85rem' },
    overline: { fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.68rem', textTransform: 'uppercase' },
    caption: { letterSpacing: 0, fontSize: '0.75rem' },
  },
};

const palettes = {
  dark: {
    mode: 'dark',
    primary: { main: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8' },
    secondary: { main: '#a855f7', light: '#c084fc', dark: '#7e22ce' },
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    info: { main: '#3b82f6' },
    background: { default: '#0b1120', paper: '#131a2b' },
    text: { primary: '#f8fafc', secondary: '#94a3b8' },
    divider: 'rgba(148, 163, 184, 0.16)',
  },
  light: {
    mode: 'light',
    primary: { main: '#2563eb', light: '#3b82f6', dark: '#1d4ed8' },
    secondary: { main: '#7e22ce', light: '#a855f7', dark: '#581c87' },
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    info: { main: '#2563eb' },
    background: { default: '#f4f6f8', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
};

export function makeTheme(mode) {
  const palette = palettes[mode] || palettes.dark;
  const isDark = palette.mode === 'dark';

  return createTheme({
    ...common,
    palette,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.background.default,
            color: palette.text.primary,
          },
          '*::-webkit-scrollbar': { width: 6, height: 6 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(0,0,0,0.2)',
            borderRadius: 6,
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            backgroundColor: theme.palette.background.paper,
            borderRadius: 6, // Slightly smaller border radius
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 6, // Slightly smaller border radius
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none',
          }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 4 },
          sizeSmall: { height: 22 },
        },
      },
    },
  });
}
