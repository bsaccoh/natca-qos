import { createTheme, alpha } from '@mui/material/styles';

const SERIF = '"Source Serif 4", Georgia, "Times New Roman", serif';
const SANS  = '"Outfit", "Inter", "Segoe UI", Roboto, system-ui, sans-serif';

/* ── Institutional palette (light only) ──────────────────────────── */
export const BRAND = {
  navy:      '#0d2c54', // authority — top bar, footer, display headings
  navyDeep:  '#081f3d',
  primary:   '#0b57a4', // action blue
  primaryDk: '#083f78',
  primaryLt: '#eaf2fb', // tint fill
  gold:      '#c19a3e', // official-seal accent, used sparingly
  paper:     '#ffffff',
  alt:       '#f5f8fc', // alternating section band
  border:    '#e4eaf1',
  text:      '#152a44',
  textSub:   '#5a6a80',
  textMute:  '#8a97a8',
};

const palette = {
  mode: 'light',
  primary:   { main: BRAND.primary, light: '#3a7cc0', dark: BRAND.primaryDk, contrastText: '#ffffff' },
  secondary: { main: BRAND.navy,    light: '#2c4d78', dark: BRAND.navyDeep,  contrastText: '#ffffff' },
  success:   { main: '#1f7a4d' },
  warning:   { main: '#b26a00' },
  error:     { main: '#c23934' },
  info:      { main: BRAND.primary },
  background:{ default: BRAND.paper, paper: BRAND.paper },
  text:      { primary: BRAND.text, secondary: BRAND.textSub, disabled: BRAND.textMute },
  divider:   BRAND.border,
};

const typography = {
  fontFamily: SANS,
  fontSize: 16,
  h1: { fontFamily: SERIF, fontWeight: 700, fontSize: '3.4rem', letterSpacing: '-0.015em', lineHeight: 1.1 },
  h2: { fontFamily: SERIF, fontWeight: 700, fontSize: '2.6rem',  letterSpacing: '-0.012em', lineHeight: 1.15 },
  h3: { fontFamily: SERIF, fontWeight: 600, fontSize: '2.05rem', letterSpacing: '-0.01em',  lineHeight: 1.2 },
  h4: { fontFamily: SERIF, fontWeight: 600, fontSize: '1.6rem',  letterSpacing: '-0.005em', lineHeight: 1.3 },
  h5: { fontFamily: SANS,  fontWeight: 600, fontSize: '1.35rem', letterSpacing: '-0.005em' },
  h6: { fontFamily: SANS,  fontWeight: 600, fontSize: '1.15rem' },
  body1: { fontSize: '1.02rem', lineHeight: 1.7 },
  body2: { fontSize: '0.95rem', lineHeight: 1.65 },
  subtitle1: { fontWeight: 600, fontSize: '1.1rem' },
  subtitle2: { fontWeight: 600, fontSize: '0.95rem' },
  button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.005em', fontSize: '0.95rem' },
  overline: { fontWeight: 700, letterSpacing: '0.12em', fontSize: '0.72rem', textTransform: 'uppercase' },
  caption: { letterSpacing: 0, fontSize: '0.85rem' },
};

export function makeTheme() {
  return createTheme({
    shape: { borderRadius: 8 },
    palette,
    typography,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: BRAND.paper },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: '#c3cedd', borderRadius: 8, border: '2px solid #fff',
          },
          '*::-webkit-scrollbar-thumb:hover': { backgroundColor: '#a9b7cb' },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: BRAND.paper,
            border: `1px solid ${BRAND.border}`,
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 10,
            border: `1px solid ${BRAND.border}`,
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            '&:hover': {
              boxShadow: '0 10px 28px rgba(13,44,84,0.08)',
              borderColor: alpha(BRAND.primary, 0.35),
            },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8, padding: '9px 22px', transition: 'background-color .18s ease, color .18s ease, border-color .18s ease' },
          sizeLarge: { padding: '12px 28px', fontSize: '1rem' },
          containedPrimary: {
            backgroundColor: BRAND.primary,
            '&:hover': { backgroundColor: BRAND.primaryDk },
          },
          containedSecondary: {
            backgroundColor: BRAND.navy,
            '&:hover': { backgroundColor: BRAND.navyDeep },
          },
          outlinedPrimary: {
            borderColor: alpha(BRAND.primary, 0.4),
            '&:hover': { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLt },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 600 },
          filledPrimary: softChip(BRAND.primary),
          filledSuccess: softChip('#1f7a4d'),
          filledWarning: softChip('#b26a00'),
          filledError:   softChip('#c23934'),
          filledInfo:    softChip(BRAND.primary),
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: { backgroundColor: BRAND.paper, color: BRAND.text },
        },
      },
      MuiContainer: { defaultProps: { maxWidth: 'lg' } },
    },
  });
}

function softChip(main) {
  return { backgroundColor: alpha(main, 0.1), color: main, border: `1px solid ${alpha(main, 0.25)}` };
}

export const STATUS_COLOR = {
  NEW: 'error', UNDER_REVIEW: 'warning', ASSIGNED: 'info',
  ESCALATED: 'error', RESOLVED: 'success', CLOSED: 'default', REOPENED: 'warning',
};
