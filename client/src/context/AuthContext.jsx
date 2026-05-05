import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { storeToken, clearStoredToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── Check session on mount ──────────────────────────────────────────
     On page load we call /auth/me.  If a valid Bearer token is in
     sessionStorage the request interceptor adds it automatically.
     If the access token is expired we try a silent refresh (which uses
     the httpOnly refresh-token cookie or returns 401 if not logged in).
  ──────────────────────────────────────────────────────────────────── */
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      // Access token missing/expired — try a silent refresh first
      try {
        const { data: refreshData } = await api.post('/auth/refresh-token');
        if (refreshData?.accessToken) storeToken(refreshData.accessToken);
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
    // Store the access token so subsequent requests use Bearer header
    if (data.accessToken) storeToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password, phone) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    if (data.accessToken) storeToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearStoredToken();
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
