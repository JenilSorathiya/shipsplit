import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sign in to ShipSplit</h2>
        <p className="mt-1 text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">Sign up free</Link>
        </p>
      </div>

      <button onClick={handleGoogleLogin} className="btn-secondary w-full">
        <img src="/google.svg" alt="" className="h-4 w-4" />
        Continue with Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
        <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">or continue with email</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label">Password</label>
          <input {...register('password')} type="password" className="input" placeholder="••••••••" />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          <div className="mt-1 text-right">
            <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700">Forgot password?</Link>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
