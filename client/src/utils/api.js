import axios from 'axios';
import toast from 'react-hot-toast';

/* ── Token store ─────────────────────────────────────────────────────────
   The server sets httpOnly cookies, but cross-domain (Vercel → Render) the
   browser blocks them with sameSite restrictions.

   Solution:
   - Server returns accessToken + refreshToken in the response body.
   - Access token  → memory + sessionStorage  (cleared on tab close)
   - Refresh token → localStorage             (persists across tabs/reloads)
   Both are sent explicitly so cookies are never relied upon cross-domain.
────────────────────────────────────────────────────────────────────────── */
const _AT_KEY = '_ss_at';   // access token  – sessionStorage
const _RT_KEY = '_ss_rt';   // refresh token – localStorage
let _token = null;

// Restore access token from sessionStorage on page load (survives F5 refresh)
try {
  const t = sessionStorage.getItem(_AT_KEY);
  if (t) _token = t;
} catch { /* ignore – privacy mode may block sessionStorage */ }

export const storeToken = (accessToken, refreshToken) => {
  _token = accessToken || null;
  try {
    if (accessToken) sessionStorage.setItem(_AT_KEY, accessToken);
    else             sessionStorage.removeItem(_AT_KEY);
  } catch { /* ignore */ }
  if (refreshToken !== undefined) {
    try {
      if (refreshToken) localStorage.setItem(_RT_KEY, refreshToken);
      else              localStorage.removeItem(_RT_KEY);
    } catch { /* ignore */ }
  }
};

export const clearStoredToken = () => {
  storeToken(null, null);
};

const getStoredRefreshToken = () => {
  try { return localStorage.getItem(_RT_KEY) || null; } catch { return null; }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,          // still send cookies (useful if same-domain or fixed later)
  headers: { 'Content-Type': 'application/json' },
});

/* ── Request interceptor — inject Bearer token ───────────────────────── */
api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

/* ── Auto-refresh state ──────────────────────────────────────────────────
   When the access token (15 min) expires we silently call /auth/refresh-token.
   Any requests that 401'd while the refresh was in flight are queued and
   retried once the new token arrives.
────────────────────────────────────────────────────────────────────────── */
let isRefreshing = false;
let pendingQueue = []; // [{ resolve, reject }]

const processQueue = (error) => {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve()
  );
  pendingQueue = [];
};

/* ── Response interceptor ────────────────────────────────────────────────
   Success path  → unwrap { success, message, data } envelope
   Error path    → auto-refresh on 401, show toasts for other errors
────────────────────────────────────────────────────────────────────────── */
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && body.success === true && 'data' in body) {
      response.data = body.data ?? null;
      // Preserve pagination meta so callers can access response.meta.total etc.
      if (body.meta) response.meta = body.meta;
    }
    return response;
  },
  async (error) => {
    const status          = error.response?.status;
    const message         = error.response?.data?.message || 'Something went wrong';
    const originalRequest = error.config;
    const requestUrl      = originalRequest?.url || '';

    /* ── 401 handling ─────────────────────────────────────────────── */
    if (status === 401) {
      // Auth endpoints — don't try to refresh, just reject so callers handle it
      // auth/me is handled manually in AuthContext.fetchMe (tries refresh itself)
      const isAuthEndpoint = /\/(auth\/me|auth\/refresh-token|auth\/login|auth\/register)/.test(requestUrl);
      if (isAuthEndpoint) return Promise.reject(error);

      // Already retried once → give up, go to login
      if (originalRequest._retry) {
        clearStoredToken();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Another refresh already in progress — queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Send refresh token in body — cookies may be blocked cross-domain (Vercel→Render)
        const storedRefresh = getStoredRefreshToken();
        const { data: refreshData } = await api.post('/auth/refresh-token',
          storedRefresh ? { refreshToken: storedRefresh } : {}
        );
        if (refreshData?.accessToken) {
          storeToken(refreshData.accessToken, refreshData.refreshToken);
        }
        processQueue(null);
        return api(originalRequest);             // retry original request
      } catch (refreshErr) {
        clearStoredToken();
        processQueue(refreshErr);
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    /* ── Other errors ─────────────────────────────────────────────── */
    if (status === 403) {
      toast.error(message);
    } else if (status === 429) {
      toast.error('Too many requests. Please slow down.');
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export default api;
