import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import Icon from '../../components/ui/Icon';
import PortalSwitcher from '../../components/ui/PortalSwitcher';

export const CitizenNavbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadNotificationsCount } = useComplaintStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-[#0a0d16]/80 backdrop-blur-xl border-b border-gray-800/80 text-white shadow-sm">
      {/* Left: Quick Breadcrumb / Portal Tag */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            National Civic Grievance Portal
          </span>
        </div>
        <span className="hidden md:inline text-xs text-gray-500">|</span>
        <span className="hidden md:inline text-xs text-gray-400">
          Ward Location: <span className="text-gray-200 font-semibold">{user?.address || 'Central District'}</span>
        </span>
      </div>

      {/* Right: Quick Actions, Portal Switcher, Notifications, User Profile */}
      <div className="flex items-center gap-3.5">
        <Link
          to="/citizen/complaints/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-md shadow-emerald-600/20 active:scale-95"
        >
          <Icon name="add" size={16} />
          <span>New Grievance</span>
        </Link>

        <PortalSwitcher />

        {isAuthenticated && (
          <Link
            to="/citizen/notifications"
            aria-label="Notifications"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/80 rounded-xl transition-colors relative border border-gray-800/60"
          >
            <Icon name="notifications" size={20} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0d111c]"></span>
            )}
          </Link>
        )}

        <div className="h-5 w-px bg-gray-800 hidden sm:block"></div>

        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Link to="/citizen/profile" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs group-hover:scale-105 transition-transform">
                {user?.full_name?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-bold text-gray-200 leading-tight group-hover:text-emerald-300 transition-colors">
                  {user?.full_name || 'Citizen'}
                </div>
                <div className="text-[10px] text-gray-400">Citizen Account</div>
              </div>
            </Link>

            <button
              onClick={async () => {
                await logout();
                navigate('/login/citizen');
              }}
              title="Sign Out"
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login/citizen"
              className="px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default CitizenNavbar;
