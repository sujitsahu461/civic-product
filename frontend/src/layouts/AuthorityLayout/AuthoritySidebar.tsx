import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import authorityService from '../../services/authority.service';
import Icon from '../../components/ui/Icon';
import PortalSwitcher from '../../components/ui/PortalSwitcher';

export const AuthoritySidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = () => {
    authorityService
      .getUnreadCount()
      .then((res) => setUnreadCount(res.unread_count))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 4000);
    window.addEventListener('focus', fetchUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchUnread);
    };
  }, [location.pathname]);

  const menuItems = [
    { label: 'Ward Dashboard', path: '/authority/dashboard', icon: 'space_dashboard' },
    { label: 'Assigned Queue', path: '/authority/complaints', icon: 'assignment' },
    { label: 'SLA & Analytics', path: '/authority/analytics', icon: 'analytics' },
    { label: 'Notifications', path: '/authority/notifications', icon: 'notifications', badge: unreadCount },
  ];

  return (
    <aside className="w-64 bg-[#0a0d16] border-r border-gray-800/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div className="p-4 space-y-5">
        <Link to="/authority/dashboard" className="flex items-center gap-3 px-2 py-1 group">
          <div className="w-10 h-10 rounded-xl bg-white/95 flex items-center justify-center p-1.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <img src="/logo-mark.png" alt="CivicSetu Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-100 tracking-tight">CivicSetu</div>
            <div className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              AUTHORITY PORTAL
            </div>
          </div>
        </Link>

        <div className="px-2">
          <PortalSwitcher />
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-800/80 space-y-3 bg-[#080b12]">
        <div className="px-2 py-1">
          <div className="text-xs font-bold text-gray-200 truncate">{user?.full_name || 'Nodal Officer'}</div>
          <div className="text-[11px] text-indigo-400 font-medium truncate">{user?.department || 'Municipal Authority'}</div>
        </div>
        <button
          onClick={async () => {
            await logout();
            navigate('/login/authority');
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

export default AuthoritySidebar;
