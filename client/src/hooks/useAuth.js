import { useAuthContext } from '../context/AuthContext';

// Re-export for cleaner imports
export const useAuth = () => useAuthContext();
