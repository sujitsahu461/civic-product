import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { UserRole } from '../types/user';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0b0f19] text-gray-300 text-sm">
        Initializing CivicSetu OS...
      </div>
    );
  }

  if (!isAuthenticated) {
    if (allowedRoles?.includes('AUTHORITY') && !allowedRoles?.includes('CITIZEN')) {
      return <Navigate to="/login/authority" replace />;
    }
    if (allowedRoles?.includes('SUPER_ADMIN') && !allowedRoles?.includes('CITIZEN')) {
      return <Navigate to="/login/superadmin" replace />;
    }
    return <Navigate to="/login/citizen" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect user to their appropriate role home page
    if (user.role === 'CITIZEN') return <Navigate to="/citizen/dashboard" replace />;
    if (user.role === 'AUTHORITY') return <Navigate to="/authority/dashboard" replace />;
    if (user.role === 'SUPER_ADMIN') return <Navigate to="/superadmin/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
