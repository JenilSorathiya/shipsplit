import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon, CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

/* ── Platform OAuth button config ────────────────────── */
const PLATFORMS = [
  {
    id: 'amazon',
    name: 'Amazon',
    color: 'bg-[#FF9900] hover:bg-[#e88a00]',
    text: 'text-white',
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
        <path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.699-3.182v.685zm3.186 7.705c-.209.189-.512.201-.745.074-1.052-.872-1.238-1.276-1.814-2.106-1.734 1.767-2.962 2.297-5.209 2.297-2.66 0-4.731-1.641-4.731-4.925 0-2.565 1.391-4.309 3.37-5.164 1.715-.754 4.11-.891 5.942-1.095V6.41c0-.548.043-1.196-.28-1.672-.281-.427-.84-.604-1.329-.604-1.354 0-2.568.707-2.862 2.149-.061.32-.298.637-.622.652l-3.48-.374c-.293-.066-.618-.303-.534-.75C5.977 2.404 9.173 1 12.071 1c1.494 0 3.447.397 4.626 1.528 1.494 1.397 1.35 3.258 1.35 5.287v4.791c0 1.441.598 2.073 1.16 2.851.198.278.241.611-.01.818l-2.053 1.52zm3.603 3.571C19.189 22.65 16.3 24 13.706 24c-3.629 0-6.928-1.344-9.407-3.579-.196-.176-.021-.417.215-.281 2.676 1.559 5.983 2.494 9.401 2.494 2.306 0 4.84-.479 7.17-1.469.352-.148.646.231.314.47l-.652.231zm.966-1.095c-.267-.344-1.769-.163-2.442-.082-.205.025-.237-.153-.052-.282 1.196-.842 3.162-.599 3.391-.317.229.284-.06 2.25-1.183 3.191-.172.145-.337.068-.26-.121.253-.63.817-2.043.546-2.389z"/>
      </svg>
    ),
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    color: 'bg-[#2874F0] hover:bg-[#1a5fd8]',
    text: 'text-white',
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
        <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm5 3L9 9h2v5l3-4h-2l2-4z"/>
      </svg>
    ),
  },
  {
    id: 'meesho',
    name: 'Meesho',
    color: 'bg-[#F43397] hover:bg-[#d41f7e]',
    text: 'text-white',
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
      </svg>
    ),
  },
  {
    id: 'myntra',
    name: 'Myntra',
    color: 'bg-[#FF3F6C] hover:bg-[#e02558]',
    text: 'text-white',
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
];

const STATS = [
  { value: '12,000+', label: 'Active sellers' },
  { value: '4',       label: 'Major platforms' },
  { value: '2M+',     label: 'Labels/month' },
];

const FEATURES = [
  'Bulk label generation in seconds',
  'Amazon, Flipkart, Meesho & Myntra',
  'Courier-wise intelligent splitting',
  'One-click PDF download',
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email, password }) => {
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformLogin = (platformId) => {
    setOauthLoading(platformId);
    window.location.href = `/api/auth/${platformId}`;
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: Brand ──────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex-col justify-between p-12 overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        {/* Floating accent blobs */}
        <div className="absolute top-20 right-20 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute bottom-20 left-10 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ShipSplit</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1 text-xs text-white/80 font-medium mb-5 ring-1 ring-white/20">
              <SparklesIcon className="h-3.5 w-3.5" />
              Built for Indian ecommerce sellers
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
              Your shipping<br />
              <span className="text-primary-300">command center</span>
            </h1>
            <p className="mt-4 text-lg text-white/60 leading-relaxed max-w-sm">
              Manage labels from all platforms in one dashboard. Generate, split, and download in seconds.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-white/70">
                <div className="h-5 w-5 rounded-full bg-success-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="h-3 w-3 text-success-400" />
                </div>
                {f}
              </li>
            ))}
          </ul>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-white/50 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Platform logos strip */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/40 mr-1">Supported:</span>
            {PLATFORMS.map((p) => (
              <div key={p.id} className={`${p.color} px-2.5 py-1 rounded-md text-white text-xs font-semibold`}>
                {p.name}
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 bg-white/5 backdrop-blur rounded-2xl p-5 ring-1 ring-white/10">
          <p className="text-sm text-white/80 leading-relaxed italic">
            "ShipSplit saves us 3+ hours daily. We process labels for 500+ orders across Amazon and Meesho without switching tabs."
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary-400/30 flex items-center justify-center text-white font-semibold text-sm">R</div>
            <div>
              <p className="text-xs font-semibold text-white">Rahul Agarwal</p>
              <p className="text-2xs text-white/40">Founder, StyleKart — Selling on 3 platforms</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: Form ──────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 bg-white overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <span className="font-bold text-gray-900">ShipSplit</span>
        </div>

        <div className="w-full max-w-md mx-auto">
          {/* 7-day trial banner */}
          <div className="mb-6 flex items-center gap-3 bg-gradient-to-r from-primary-50 to-success-50 border border-primary-100 rounded-xl px-4 py-3">
            <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="h-4 w-4 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Start your 7-day free trial</p>
              <p className="text-xs text-gray-500">No credit card required. All features unlocked.</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to manage your shipping labels.{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
                New here? Sign up
              </Link>
            </p>
          </div>

          {/* Platform OAuth buttons */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePlatformLogin(p.id)}
                disabled={!!oauthLoading}
                className={`${p.color} ${p.text} flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-60 shadow-sm`}
              >
                {oauthLoading === p.id ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : p.logo}
                {p.name}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={() => handlePlatformLogin('google')}
            disabled={!!oauthLoading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 mb-5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-xs"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium text-gray-400">or sign in with email</span>
            </div>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="form-label">Email address</label>
              <input
                {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })}
                type="email"
                className="form-input"
                placeholder="rahul@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  className="form-input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="h-4 w-4" />
              <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">Remember me for 30 days</label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm font-semibold shadow-sm">
              {loading ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Signing in…</>
              ) : 'Sign in to ShipSplit'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            By signing in, you agree to our{' '}
            <a href="#" className="text-gray-600 hover:underline">Terms of Service</a>{' '}
            and{' '}
            <a href="#" className="text-gray-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
