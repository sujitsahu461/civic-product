import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import Icon from '../../components/ui/Icon';
import PortalSwitcher from '../../components/ui/PortalSwitcher';

export const CitizenHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadNotificationsCount, fetchNotifications } = useComplaintStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 4000);
      window.addEventListener('focus', fetchNotifications);
      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', fetchNotifications);
      };
    }
  }, [isAuthenticated]);

  const navItems = [
    { label: 'Dashboard', path: '/citizen/dashboard', icon: 'space_dashboard' },
    { label: 'My Grievances', path: '/citizen/complaints', icon: 'list_alt' },
    { label: 'File Grievance', path: '/citizen/complaints/new', icon: 'add_circle' },
    { label: 'Track Status', path: '/citizen/tracking', icon: 'find_in_page' },
    { label: 'GIS Radar Map', path: '/map', icon: 'explore' },
    { label: 'Profile', path: '/citizen/profile', icon: 'person' },
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-[#0d111c]/90 backdrop-blur-md border-b border-gray-800 text-white">
      <Link to="/citizen/dashboard" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
        <div className="w-8 h-8 rounded-lg bg-white/95 flex items-center justify-center p-1 shadow-md">
          <img src="/logo-mark.png" alt="CivicSetu Logo" className="w-full h-full object-contain" />
        </div>
        <span className="text-gray-100 font-extrabold">CivicSetu</span>
      </Link>

      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <PortalSwitcher />
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Link
              to="/citizen/notifications"
              aria-label="Notifications"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors relative"
            >
              <Icon name="notifications" size={20} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0d111c]"></span>
              )}
            </Link>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-gray-200">{user?.full_name || user?.email}</div>
              <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Citizen Account</div>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate('/login/citizen');
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login/citizen"
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup/citizen"
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default CitizenHeader;
