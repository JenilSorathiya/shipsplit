import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── Check session on mount ──────────────────────────────────────────
     The access token lives in an httpOnly cookie — we can't read it in JS.
     Just call /auth/me: if the cookie is valid the server returns the user,
     if not it returns 401 which we silently handle (user stays null).
  ──────────────────────────────────────────────────────────────────── */
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      // Access token may have expired — try a silent refresh before giving up
      try {
        await api.post('/auth/refresh-token');
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        setUser(null);   // not logged in — that's fine
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  /* ── Auth actions ──────────────────────────────────────────────────── */
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    // Cookie is set by the server; we just capture the user object
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password, phone) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setUser(null);
  };

  const updateUser = (updates) =>
    setUser((prev) => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refetchUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
