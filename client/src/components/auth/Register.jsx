import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional().or(z.literal('')),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[0-9]/, 'Include a number'),
});

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await registerUser(values.name, values.email, values.password, values.phone);
      toast.success('Account created! Welcome to ShipSplit.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
        <p className="mt-1 text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">Sign in</Link>
        </p>
      </div>

      <button onClick={() => window.location.href = '/api/auth/google'} className="btn-secondary w-full">
        <img src="/google.svg" alt="" className="h-4 w-4" />
        Sign up with Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
        <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">or sign up with email</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input {...register('name')} className="input" placeholder="Rahul Sharma" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Email</label>
          <input {...register('email')} type="email" className="input" placeholder="rahul@example.com" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label">Mobile Number <span className="text-gray-400 font-normal">(optional)</span></label>
          <input {...register('phone')} className="input" placeholder="9876543210" maxLength={10} />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="label">Password</label>
          <input {...register('password')} type="password" className="input" placeholder="Min 8 chars, 1 uppercase, 1 number" />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <p className="text-xs text-gray-400">
          By signing up you agree to our <a href="#" className="text-brand-600">Terms of Service</a> and <a href="#" className="text-brand-600">Privacy Policy</a>.
        </p>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
