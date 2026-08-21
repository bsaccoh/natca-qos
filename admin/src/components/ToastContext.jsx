import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Alert, Stack, Slide } from '@mui/material';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, severity = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, severity }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const contextValue = useMemo(() => ({
    showToast,
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
    warning: (msg) => showToast(msg, 'warning'),
  }), [showToast]);

  return (
    <ToastCtx.Provider value={contextValue}>
      {children}
      <Stack
        spacing={1}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 2500,
          maxWidth: 400,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <Slide key={t.id} in direction="left" mountOnEnter unmountOnExit>
            <Alert
              severity={t.severity}
              variant="filled"
              elevation={6}
              onClose={() => dismiss(t.id)}
              sx={{
                borderRadius: 1.5,
                fontSize: 13.5,
                fontWeight: 500,
                boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                pointerEvents: 'all',
              }}
            >
              {t.message}
            </Alert>
          </Slide>
        ))}
      </Stack>
    </ToastCtx.Provider>
  );
}
