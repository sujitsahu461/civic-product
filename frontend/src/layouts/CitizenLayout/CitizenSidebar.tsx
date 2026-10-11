import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import Icon from '../../components/ui/Icon';
import PortalSwitcher from '../../components/ui/PortalSwitcher';
export const CitizenSidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { unreadNotificationsCount, fetchNotifications } = useComplaintStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 4000);
    window.addEventListener('focus', fetchNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchNotifications);
    };
  }, []);

  const menuItems = [
    { label: 'Dashboard', path: '/citizen/dashboard', icon: 'space_dashboard' },
    { label: 'My Grievances', path: '/citizen/complaints', icon: 'list_alt' },
    { label: 'File Grievance', path: '/citizen/complaints/new', icon: 'add_circle', highlight: true },
    { label: 'Track Status', path: '/citizen/tracking', icon: 'find_in_page' },
    { label: 'GIS Radar Map', path: '/map', icon: 'explore' },
    { label: 'Profile', path: '/citizen/profile', icon: 'person' },
    { label: 'Notifications', path: '/citizen/notifications', icon: 'notifications', badge: unreadNotificationsCount },
  ];

  return (
    <aside className="w-64 bg-[#0a0e17] border-r border-emerald-950/40 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none shadow-2xl z-40">
      <div className="p-4 space-y-5">
        {/* Brand Header */}
        <Link to="/citizen/dashboard" className="flex items-center gap-3 px-2 py-1 group">
          <div className="w-10 h-10 rounded-xl bg-white/95 flex items-center justify-center p-1.5 shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition-transform">
            <img src="/logo-mark.png" alt="CivicSetu Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-100 tracking-tight flex items-center gap-1.5">
              <span>CivicSetu</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Citizen Portal
            </div>
          </div>
        </Link>

        {/* Portal Switcher Button */}
        <div className="px-1">
          <PortalSwitcher />
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Citizen Services
          </div>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 translate-x-1'
                    : item.highlight
                    ? 'text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 hover:text-emerald-300'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    name={item.icon}
                    size={20}
                    className={isActive ? 'text-emerald-400' : item.highlight ? 'text-emerald-400' : 'text-gray-400'}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full animate-bounce">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Sign Out */}
      <div className="p-4 border-t border-gray-800/80 space-y-3 bg-[#080b12]">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
            {user?.full_name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-gray-200 truncate">{user?.full_name || 'Citizen User'}</div>
            <div className="text-[10px] text-emerald-400 font-medium truncate">Citizen Account</div>
          </div>
        </div>

        <button
          onClick={async () => {
            await logout();
            navigate('/login/citizen');
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
        >
          <Icon name="logout" size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default CitizenSidebar;
