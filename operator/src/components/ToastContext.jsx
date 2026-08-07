import { createContext, useContext, useState, useCallback } from 'react';
import { Alert, Stack, Slide } from '@mui/material';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, severity = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, severity }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <Stack spacing={1} sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 2000, maxWidth: 380, pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <Slide key={t.id} in direction="left" mountOnEnter unmountOnExit>
            <Alert severity={t.severity} variant="filled" elevation={6}
              onClose={() => dismiss(t.id)}
              sx={{ borderRadius: 1.5, fontSize: 14, pointerEvents: 'all' }}>
              {t.message}
            </Alert>
          </Slide>
        ))}
      </Stack>
    </ToastCtx.Provider>
  );
}
