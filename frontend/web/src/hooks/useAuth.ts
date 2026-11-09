import { useEffect } from 'react';
import useAuthStore from '../store/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, login, register, logout, checkAuth, updateProfile } = useAuthStore();

  useEffect(() => {
    if (!user && !isAuthenticated) {
      checkAuth();
    }
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    role: user?.role,
    isCitizen: user?.role === 'CITIZEN',
    isAuthority: user?.role === 'AUTHORITY',
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    login,
    register,
    logout,
    updateProfile,
  };
}

export default useAuth;
