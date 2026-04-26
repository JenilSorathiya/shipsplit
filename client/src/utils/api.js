import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach stored token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

/* ── Response interceptor ────────────────────────────────────────────
   The backend wraps every response in { success, message, data, meta }.
   This interceptor unwraps it so every caller gets the inner `data`
   directly:
     const { data } = await api.get('/auth/me')
     // data = { user: {...} }  ← not { success, message, data: { user } }
   ────────────────────────────────────────────────────────────────── */
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && body.success === true && 'data' in body) {
      response.data = body.data ?? null;
    }
    return response;
  },
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message || 'Something went wrong';

    if (status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthCheck = requestUrl.includes('/auth/me');
      const onLoginPage = window.location.pathname.startsWith('/login');
      // Only hard-redirect for protected actions, not the initial /auth/me check
      if (!isAuthCheck && !onLoginPage) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    } else if (status === 403) {
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
