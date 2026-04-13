import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon, CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const pw = watch('password', '');

  const strength = pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)
    ? 'strong' : pw.length >= 6 ? 'medium' : pw.length > 0 ? 'weak' : null;

  const onSubmit = async ({ name, email, password, phone }) => {
    setLoading(true);
    try {
      await registerUser(name, email, password, phone);
      toast.success('Welcome to ShipSplit!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">ShipSplit</span>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-7">
          {/* Trial banner */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-primary-50 to-success-50 border border-primary-100 rounded-xl px-4 py-3 mb-6">
            <SparklesIcon className="h-5 w-5 text-primary-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">7-day free trial</p>
              <p className="text-xs text-gray-500">No credit card needed · All features unlocked</p>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-sm text-gray-500 mb-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Sign in</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="form-label">Full Name</label>
              <input {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })} className="form-input" placeholder="Rahul Sharma" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="form-label">Email Address</label>
              <input {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })} type="email" className="form-input" placeholder="rahul@example.com" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="form-label">Mobile Number <span className="text-gray-400 font-normal">(optional)</span></label>
              <input {...register('phone', { pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number' } })} className="form-input" placeholder="9876543210" maxLength={10} />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                    validate: (v) => /[A-Z]/.test(v) || 'Include at least one uppercase letter',
                  })}
                  type={showPw ? 'text' : 'password'}
                  className="form-input pr-10"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {strength && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {['weak','medium','strong'].map((s, i) => (
                      <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
                        (strength === 'weak' && i === 0) ? 'bg-red-400' :
                        (strength === 'medium' && i <= 1) ? 'bg-warning-400' :
                        (strength === 'strong') ? 'bg-success-500' : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${strength === 'strong' ? 'text-success-600' : strength === 'medium' ? 'text-warning-600' : 'text-red-500'}`}>
                    {strength.charAt(0).toUpperCase() + strength.slice(1)}
                  </span>
                </div>
              )}
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <p className="text-xs text-gray-400">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-gray-600 hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href="#" className="text-gray-600 hover:underline">Privacy Policy</a>.
            </p>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 font-semibold">
              {loading ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating account…</>
              ) : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
