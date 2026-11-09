import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import authorityService from '../../services/authority.service';
import Icon from '../../components/ui/Icon';
import PortalSwitcher from '../../components/ui/PortalSwitcher';

export const AuthorityNavbar: React.FC = () => {
  const { user, logout } = useAuthStore();
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
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-[#080b12]/80 backdrop-blur-xl border-b border-gray-800/80 text-white shadow-sm">
      {/* Left: Department Tag & Dispatch Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            {user?.department || 'Municipal Authority'} Command Hub
          </span>
        </div>
        <span className="hidden md:inline text-xs text-gray-500">|</span>
        <span className="hidden md:inline text-xs text-gray-400">
          Officer: <span className="text-gray-200 font-semibold">{user?.full_name || 'Nodal Officer'}</span>
        </span>
      </div>

      {/* Right: Quick Action, Portal Switcher, Notifications, Officer Avatar */}
      <div className="flex items-center gap-3.5">
        <Link
          to="/authority/complaints"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md shadow-indigo-600/20 active:scale-95"
        >
          <Icon name="assignment" size={16} />
          <span>Incident Queue</span>
        </Link>

        <PortalSwitcher />

        <Link
          to="/authority/notifications"
          aria-label="Notifications"
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/80 rounded-xl transition-colors relative border border-gray-800/60"
        >
          <Icon name="notifications" size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-indigo-400 ring-2 ring-[#080b12]"></span>
          )}
        </Link>

        <div className="h-5 w-px bg-gray-800 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-xs">
              {user?.full_name?.charAt(0).toUpperCase() || 'O'}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold text-gray-200 leading-tight">
                {user?.full_name || 'Nodal Officer'}
              </div>
              <div className="text-[10px] text-indigo-400 font-semibold">Municipal Authority</div>
            </div>
          </div>

          <button
            onClick={async () => {
              await logout();
              navigate('/login/authority');
            }}
            title="Sign Out"
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AuthorityNavbar;
