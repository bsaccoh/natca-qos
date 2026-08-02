import { createContext, useContext, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { makeTheme } from './theme.js';

/* Light-only enterprise theme. The API is kept (mode/toggle) so existing
   callers keep working, but the app no longer offers a dark mode. */
const Ctx = createContext({ mode: 'light', toggle: () => {} });
export const useColorMode = () => useContext(Ctx);

export function ColorModeProvider({ children }) {
  const theme = useMemo(() => makeTheme(), []);
  return (
    <Ctx.Provider value={{ mode: 'light', toggle: () => {} }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Ctx.Provider>
  );
}
