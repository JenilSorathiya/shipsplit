import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../utils/api';

export default function VerifyEmailPage() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get(`/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'The verification link is invalid or has expired.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">ShipSplit</span>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">

          {/* Loading */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <ArrowPathIcon className="h-12 w-12 text-primary-500 animate-spin" />
              <p className="text-gray-600 font-medium">Verifying your email…</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircleIcon className="h-16 w-16 text-success-500" />
              <h2 className="text-xl font-bold text-gray-900">Email Verified!</h2>
              <p className="text-gray-500 text-sm">
                Your email address has been verified. You can now use all features of ShipSplit.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary mt-2 w-full justify-center"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <XCircleIcon className="h-16 w-16 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900">Verification Failed</h2>
              <p className="text-gray-500 text-sm">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                <Link to="/dashboard" className="btn-secondary flex-1 text-center justify-center">
                  Go to Dashboard
                </Link>
                <Link to="/dashboard/settings" className="btn-primary flex-1 text-center justify-center">
                  Resend Email
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
