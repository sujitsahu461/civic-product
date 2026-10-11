import React from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';

// Layouts
import CitizenLayout from '../layouts/CitizenLayout/CitizenLayout';
import AuthorityLayout from '../layouts/AuthorityLayout/AuthorityLayout';
import SuperAdminLayout from '../layouts/SuperAdminLayout/SuperAdminLayout';

// Protection
import ProtectedRoute from './ProtectedRoute';

// Public Auth & Landing Pages
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import CitizenLogin from '../pages/CitizenLogin';
import AuthorityLogin from '../pages/AuthorityLogin';
import SuperAdminLogin from '../pages/SuperAdminLogin';
import CitizenSignup from '../pages/CitizenSignup';
import AuthoritySignup from '../pages/AuthoritySignup';
import SuperAdminSignup from '../pages/SuperAdminSignup';
import ResetPassword from '../pages/ResetPassword';
import MapView from '../pages/MapView';

// Citizen Pages
import CitizenDashboard from '../pages/citizen/CitizenDashboard';
import SubmitComplaint from '../pages/citizen/SubmitComplaint';
import ComplaintHistory from '../pages/citizen/ComplaintHistory';
import TrackComplaint from '../pages/citizen/TrackComplaint';
import CitizenProfile from '../pages/citizen/CitizenProfile';
import CitizenNotifications from '../pages/citizen/CitizenNotifications';

// Authority Pages
import AuthorityDashboard from '../pages/authority/AuthorityDashboard';
import ComplaintManagement from '../pages/authority/ComplaintManagement';
import AuthorityAnalytics from '../pages/authority/AuthorityAnalytics';
import AuthorityNotifications from '../pages/authority/AuthorityNotifications';
import AuthorityProfile from '../pages/authority/AuthorityProfile';

// Super Admin Pages
import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard';
import DepartmentManagement from '../pages/superadmin/DepartmentManagement';
import AuthorityManagement from '../pages/superadmin/AuthorityManagement';
import UserManagement from '../pages/superadmin/UserManagement';
import SystemComplaintManagement from '../pages/superadmin/SystemComplaintManagement';
import SystemAnalytics from '../pages/superadmin/SystemAnalytics';

const LoginRedirect: React.FC = () => {
  const [params] = useSearchParams();
  const role = (params.get('role') || '').toLowerCase();
  if (role === 'authority' || role === 'officer' || role === 'municipal') {
    return <Navigate to="/login/authority" replace />;
  }
  if (role === 'superadmin' || role === 'admin') {
    return <Navigate to="/login/superadmin" replace />;
  }
  return <Navigate to="/login/citizen" replace />;
};

const SignupRedirect: React.FC = () => {
  const [params] = useSearchParams();
  const role = (params.get('role') || '').toLowerCase();
  if (role === 'authority' || role === 'officer' || role === 'municipal') {
    return <Navigate to="/signup/authority" replace />;
  }
  if (role === 'superadmin' || role === 'admin') {
    return <Navigate to="/signup/superadmin" replace />;
  }
  return <Navigate to="/signup/citizen" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginRedirect />} />
      <Route path="/login/citizen" element={<CitizenLogin />} />
      <Route path="/login/authority" element={<AuthorityLogin />} />
      <Route path="/login/superadmin" element={<SuperAdminLogin />} />
      <Route path="/login/admin" element={<SuperAdminLogin />} />
      <Route path="/login/unified" element={<Login />} />

      <Route path="/signup" element={<SignupRedirect />} />
      <Route path="/signup/citizen" element={<CitizenSignup />} />
      <Route path="/signup/authority" element={<AuthoritySignup />} />
      <Route path="/signup/superadmin" element={<SuperAdminSignup />} />
      <Route path="/signup/admin" element={<SuperAdminSignup />} />
      <Route path="/signup/unified" element={<Signup />} />

      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/forgot-password" element={<ResetPassword />} />

      {/* Public Grievance Submission & Tracking (Anonymous & Registered Citizens) */}
      <Route element={<CitizenLayout />}>
        <Route path="/citizen/submit" element={<SubmitComplaint />} />
        <Route path="/citizen/complaints/new" element={<SubmitComplaint />} />
        <Route path="/citizen/tracking" element={<TrackComplaint />} />
        <Route path="/track" element={<TrackComplaint />} />
        <Route path="/map" element={<MapView />} />
      </Route>

      {/* Citizen Protected Module */}
      <Route element={<ProtectedRoute allowedRoles={['CITIZEN', 'SUPER_ADMIN']} />}>
        <Route element={<CitizenLayout />}>
          <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
          <Route path="/citizen/complaints" element={<ComplaintHistory />} />
          <Route path="/citizen/profile" element={<CitizenProfile />} />
          <Route path="/citizen/notifications" element={<CitizenNotifications />} />
        </Route>
      </Route>

      {/* Authority Protected Module */}
      <Route element={<ProtectedRoute allowedRoles={['AUTHORITY', 'SUPER_ADMIN']} />}>
        <Route element={<AuthorityLayout />}>
          <Route path="/authority/dashboard" element={<AuthorityDashboard />} />
          <Route path="/authority/complaints" element={<ComplaintManagement />} />
          <Route path="/authority/analytics" element={<AuthorityAnalytics />} />
          <Route path="/authority/notifications" element={<AuthorityNotifications />} />
          <Route path="/authority/profile" element={<AuthorityProfile />} />
        </Route>
      </Route>

      {/* Super Admin Protected Module */}
      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
        <Route element={<SuperAdminLayout />}>
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/departments" element={<DepartmentManagement />} />
          <Route path="/superadmin/authorities" element={<AuthorityManagement />} />
          <Route path="/superadmin/users" element={<UserManagement />} />
          <Route path="/superadmin/complaints" element={<SystemComplaintManagement />} />
          <Route path="/superadmin/analytics" element={<SystemAnalytics />} />
        </Route>
      </Route>

      {/* Catch-all redirect to Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
