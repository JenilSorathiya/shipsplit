import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,          // send httpOnly cookies on every request
  headers: { 'Content-Type': 'application/json' },
});

/* ── Auto-refresh state ──────────────────────────────────────────────────
   When the access token (15 min) expires we silently call /auth/refresh-token.
   Any requests that 401'd while the refresh was in flight are queued and
   retried once the new cookie arrives.
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
      const isAuthEndpoint = /\/(auth\/me|auth\/refresh-token|auth\/login|auth\/register)/.test(requestUrl);
      if (isAuthEndpoint) return Promise.reject(error);

      // Already retried once → give up, go to login
      if (originalRequest._retry) {
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
        await api.post('/auth/refresh-token');   // sets new access-token cookie
        processQueue(null);
        return api(originalRequest);             // retry original request
      } catch (refreshErr) {
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
