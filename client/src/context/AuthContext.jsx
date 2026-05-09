import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { storeToken, clearStoredToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── Check session on mount ──────────────────────────────────────────
     On page load we call /auth/me.  If a valid Bearer token is in
     sessionStorage the request interceptor adds it automatically.
     If the access token is expired we try a silent refresh using the
     stored refresh token (localStorage) or the httpOnly cookie.
  ──────────────────────────────────────────────────────────────────── */
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      // Access token missing/expired — try a silent refresh first
      try {
        const storedRefresh = (() => {
          try { return localStorage.getItem('_ss_rt') || undefined; } catch { return undefined; }
        })();
        const { data: refreshData } = await api.post('/auth/refresh-token',
          storedRefresh ? { refreshToken: storedRefresh } : {}
        );
        if (refreshData?.accessToken) storeToken(refreshData.accessToken, refreshData.refreshToken);
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
    // Store both tokens — refreshToken goes to localStorage for cross-domain persistence
    if (data.accessToken) storeToken(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password, phone) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    if (data.accessToken) storeToken(data.accessToken, data.refreshToken);
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
