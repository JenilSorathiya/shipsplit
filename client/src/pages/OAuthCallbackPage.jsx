import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { refetchUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const error = params.get('error');
    if (error) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login');
      return;
    }
    refetchUser().then(() => navigate('/dashboard'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
    </div>
  );
}
