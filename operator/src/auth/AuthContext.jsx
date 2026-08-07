import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import { api, tokenStore, post } from '../api/client.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket]   = useState(null);

  const loadMe = useCallback(async () => {
    if (!tokenStore.access) { setLoading(false); return; }
    try {
      const r = await api.get('/auth/me');
      const u = r.data.data;
      if (u.role !== 'OPERATOR_ADMIN') {
        tokenStore.clear();
        setLoading(false);
        return;
      }
      setUser(u);

      const s = io(import.meta.env.VITE_SOCKET_URL || undefined);
      s.emit('join', u.user_id);
      s.emit('join:operator', u.operator_id);
      setSocket(s);
    } catch {
      tokenStore.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const login = async (identifier, password) => {
    const r = await post('/auth/login', { identifier, password });
    tokenStore.set({ accessToken: r.data.accessToken, refreshToken: r.data.refreshToken });
    const me = await api.get('/auth/me');
    const u = me.data.data;
    if (u.role !== 'OPERATOR_ADMIN' && u.role_key !== 'OPERATOR_ADMIN') {
      tokenStore.clear();
      throw new Error('Access denied. This portal is for operator administrators only.');
    }
    setUser(u);

    const s = io(import.meta.env.VITE_SOCKET_URL || undefined);
    s.emit('join', u.user_id);
    s.emit('join:operator', u.operator_id);
    setSocket(s);
    return u;
  };

  const logout = async () => {
    try { await post('/auth/logout', { refreshToken: tokenStore.refresh }); } catch {}
    tokenStore.clear();
    setUser(null);
    if (socket) { socket.disconnect(); setSocket(null); }
  };

  return <AuthCtx.Provider value={{ user, loading, login, logout, socket }}>{children}</AuthCtx.Provider>;
}
