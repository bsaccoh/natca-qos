import { createTheme, alpha } from '@mui/material/styles';

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

export const CHART_PALETTE = [
  '#3b82f6', // Electric Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#ec4899', // Pink
  '#84cc16', // Lime
];

const common = {
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    h1: { fontFamily: '"Manrope", "DM Sans", sans-serif', fontWeight: 800, fontSize: '2.4rem', letterSpacing: '-0.025em', lineHeight: 1.2 },
    h2: { fontFamily: '"Manrope", "DM Sans", sans-serif', fontWeight: 800, fontSize: '1.95rem', letterSpacing: '-0.025em', lineHeight: 1.2 },
    h3: { fontFamily: '"Manrope", "DM Sans", sans-serif', fontWeight: 700, fontSize: '1.65rem', letterSpacing: '-0.02em', lineHeight: 1.25 },
    h4: { fontFamily: '"Manrope", "DM Sans", sans-serif', fontWeight: 700, fontSize: '1.38rem', letterSpacing: '-0.015em' },
    h5: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 700, fontSize: '1.18rem', letterSpacing: '-0.01em' },
    h6: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 600, fontSize: '1.02rem', letterSpacing: '-0.005em' },
    body1: { fontSize: '0.885rem', lineHeight: 1.55 },
    body2: { fontSize: '0.825rem', lineHeight: 1.45 },
    subtitle1: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 600, fontSize: '0.94rem' },
    subtitle2: { fontWeight: 600, fontSize: '0.825rem' },
    button: { fontFamily: '"Outfit", "Inter", sans-serif', textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em', fontSize: '0.85rem' },
    overline: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.7rem', textTransform: 'uppercase' },
    caption: { letterSpacing: 0, fontSize: '0.75rem' },
  },
};

const palettes = {
  dark: {
    mode: 'dark',
    primary: { main: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8', contrastText: '#ffffff' },
    secondary: { main: '#a855f7', light: '#c084fc', dark: '#7e22ce' },
    success: { main: '#10b981', light: '#34d399', dark: '#059669' },
    warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    error: { main: '#ef4444', light: '#f87171', dark: '#dc2626' },
    info: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
    background: { 
      default: '#080e1a', 
      paper: '#0f172a',
      subtle: 'rgba(255, 255, 255, 0.03)',
    },
    text: { primary: '#f8fafc', secondary: '#94a3b8', disabled: '#64748b' },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  light: {
    mode: 'light',
    primary: { main: '#2463eb', light: '#3b82f6', dark: '#1d4ed8', contrastText: '#ffffff' },
    secondary: { main: '#7c3aed', light: '#a855f7', dark: '#581c87' },
    success: { main: '#10b981', light: '#34d399', dark: '#059669' },
    warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    error: { main: '#ef4444', light: '#f87171', dark: '#dc2626' },
    info: { main: '#0284c7', light: '#38bdf8', dark: '#0369a1' },
    background: { 
      default: '#f3f6fc', 
      paper: '#ffffff',
      subtle: 'rgba(16, 35, 71, 0.02)',
    },
    text: { primary: '#102347', secondary: '#7b8aa6', disabled: '#94a3b8' },
    divider: '#e3eaf5',
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
            boxShadow: isDark 
              ? '0 10px 30px -10px rgba(0, 0, 0, 0.5)' 
              : '0 10px 30px -10px rgba(15, 23, 42, 0.05)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
            '&:hover': {
              borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.25)',
              transform: 'translateY(-2px)',
              boxShadow: isDark 
                ? '0 14px 34px -10px rgba(0, 0, 0, 0.65)' 
                : '0 14px 34px -10px rgba(15, 23, 42, 0.09)',
            },
          }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 9,
            fontWeight: 600,
            transition: 'all 0.18s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          },
          containedPrimary: {
            background: isDark 
              ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
              : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            boxShadow: isDark 
              ? '0 4px 14px rgba(59, 130, 246, 0.35)' 
              : '0 4px 14px rgba(37, 99, 235, 0.25)',
            '&:hover': {
              boxShadow: isDark 
                ? '0 6px 20px rgba(59, 130, 246, 0.45)' 
                : '0 6px 20px rgba(37, 99, 235, 0.38)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
          sizeSmall: { height: 24, fontSize: '0.725rem' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '13px 18px',
            fontSize: '0.84rem',
            borderBottom: `1px solid ${palette.divider}`,
          },
          head: {
            fontFamily: '"Outfit", "Inter", sans-serif',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: palette.text.secondary,
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(248, 250, 252, 0.85)',
            backdropFilter: 'blur(8px)',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease',
            '&.Mui-hover:hover': {
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(37, 99, 235, 0.035)',
            },
          },
        },
      },
    },
  });
}
