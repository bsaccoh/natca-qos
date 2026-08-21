import { createTheme } from '@mui/material/styles';

export const OPERATOR_COLORS = {
  'Orange': '#ff7900',
  'Orange SL': '#ff7900',
  'Orange Sierra Leone': '#ff7900',
  'Africell': '#8e24aa',
  'Qcell': '#5b2d8e',
  'SierraTel': '#00a3e0',
  'Sierra Tel': '#00a3e0',
  'National': '#2563eb',
};

export const getOperatorColor = (operatorName, fallback = '#2563eb') => {
  if (!operatorName) return fallback;
  return OPERATOR_COLORS[operatorName] || fallback;
};

export const STATUS_COLORS = {
  // Complaint statuses
  Open: '#f59e0b',
  Investigating: '#3b82f6',
  Escalated: '#ef4444',
  Resolved: '#10b981',
  Closed: '#64748b',
  NEW: '#3b82f6',
  UNDER_REVIEW: '#f59e0b',
  ASSIGNED: '#8b5cf6',
  ESCALATED: '#ef4444',
  RESOLVED: '#10b981',
  CLOSED: '#64748b',
  // KYC statuses
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  // Incident statuses
  OPEN: '#ef4444',
  // Compliance / Test statuses
  PASS: '#10b981',
  FAIL: '#ef4444',
  WARNING: '#f59e0b',
};

export const getStatusColor = (status, fallback = '#3b82f6') => {
  if (!status) return fallback;
  return STATUS_COLORS[status] || STATUS_COLORS[status.toUpperCase()] || fallback;
};

export const SEVERITY_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

export const ROLE_COLORS = {
  SYSTEM_ADMIN: '#ef4444',
  NATCA_ADMIN: '#2563eb',
  NATCA_ANALYST: '#0ea5e9',
  INSPECTOR: '#a855f7',
  OPERATOR_ADMIN: '#f59e0b',
  CITIZEN: '#10b981',
};

const common = {
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, system-ui, sans-serif',
    fontSize: 14,
    h1: { fontWeight: 700, fontSize: '2.4rem', letterSpacing: '-0.02em', lineHeight: 1.2 },
    h2: { fontWeight: 700, fontSize: '1.9rem', letterSpacing: '-0.02em', lineHeight: 1.2 },
    h3: { fontWeight: 700, fontSize: '1.6rem', letterSpacing: '-0.01em', lineHeight: 1.3 },
    h4: { fontWeight: 600, fontSize: '1.35rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, fontSize: '1.15rem', letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, fontSize: '1.0rem', letterSpacing: '0em' },
    body1: { fontSize: '0.885rem', lineHeight: 1.5 },
    body2: { fontSize: '0.815rem', lineHeight: 1.4 },
    subtitle1: { fontWeight: 600, fontSize: '0.925rem' },
    subtitle2: { fontWeight: 600, fontSize: '0.825rem' },
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
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.03)',
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none',
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
            },
          }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
            transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          },
          containedPrimary: {
            background: isDark 
              ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
              : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            boxShadow: isDark 
              ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
              : '0 4px 12px rgba(37, 99, 235, 0.25)',
            '&:hover': {
              boxShadow: isDark 
                ? '0 6px 16px rgba(59, 130, 246, 0.4)' 
                : '0 6px 16px rgba(37, 99, 235, 0.35)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 6 },
          sizeSmall: { height: 24, fontSize: '0.725rem' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '12px 16px',
            fontSize: '0.84rem',
          },
          head: {
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          },
        },
      },
    },
  });
}
