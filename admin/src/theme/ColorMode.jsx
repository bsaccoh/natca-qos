import { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { makeTheme } from './theme.js';

const Ctx = createContext({ mode: 'dark', toggle: () => {} });
export const useColorMode = () => useContext(Ctx);

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('cms_theme');
    if (saved === 'dark' || !saved) {
      // Default to crisp modern light theme
      localStorage.setItem('cms_theme', 'light');
      return 'light';
    }
    return saved;
  });
  const toggle = () => setMode((m) => { const n = m === 'dark' ? 'light' : 'dark'; localStorage.setItem('cms_theme', n); return n; });
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
