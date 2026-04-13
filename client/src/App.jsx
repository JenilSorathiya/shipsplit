import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// ── Eagerly loaded (tiny, needed immediately) ─────────────────────────
import DashboardLayout from './components/dashboard/DashboardLayout';

// ── Lazy-loaded pages (code-split per route) ──────────────────────────
const LandingPage        = lazy(() => import('./pages/LandingPage'));
const PricingPage        = lazy(() => import('./pages/PricingPage'));
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/RegisterPage'));
const OAuthCallbackPage  = lazy(() => import('./pages/OAuthCallbackPage'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const OrdersPage         = lazy(() => import('./pages/OrdersPage'));
const LabelGeneratorPage = lazy(() => import('./pages/LabelGeneratorPage'));
const ReportsPage        = lazy(() => import('./pages/ReportsPage'));
const SettingsPage       = lazy(() => import('./pages/SettingsPage'));
const BillingPage        = lazy(() => import('./pages/BillingPage'));

/* ── Full-page loading spinner ───────────────────────────────────────── */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center animate-pulse">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-200 border-t-primary-600" />
      </div>
    </div>
  );
}

/* ── Route guards ────────────────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public ─────────────────────────────── */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/pricing"       element={<PricingPage />} />
        <Route path="/login"         element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register"      element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        {/* ── Protected dashboard ────────────────── */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
        >
          <Route index                  element={<DashboardPage />} />
          <Route path="orders"          element={<OrdersPage />} />
          <Route path="label-generator" element={<LabelGeneratorPage />} />
          <Route path="reports"         element={<ReportsPage />} />
          <Route path="settings"        element={<SettingsPage />} />
          <Route path="billing"         element={<BillingPage />} />
        </Route>

        {/* ── Fallback ───────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
