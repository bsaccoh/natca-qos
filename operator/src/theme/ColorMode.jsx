import { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { makeTheme } from './theme.js';

const Ctx = createContext({ mode: 'dark', toggle: () => {} });
export const useColorMode = () => useContext(Ctx);

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('op_theme') || 'dark');
  const toggle = () => setMode((m) => { const n = m === 'dark' ? 'light' : 'dark'; localStorage.setItem('op_theme', n); return n; });
  const theme = useMemo(() => makeTheme(mode), [mode]);
  return (
    <Ctx.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Ctx.Provider>
  );
}
