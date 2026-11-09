import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/ui/Icon';
import PortalSwitcher from '../../components/ui/PortalSwitcher';
import s from './SuperAdminLayout.module.css';

interface SuperAdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { label: 'System Overview', path: '/superadmin/dashboard', icon: 'space_dashboard' },
    { label: 'Departments', path: '/superadmin/departments', icon: 'domain' },
    { label: 'Authorities', path: '/superadmin/authorities', icon: 'badge' },
    { label: 'Citizens & Users', path: '/superadmin/users', icon: 'group' },
    { label: 'All Complaints', path: '/superadmin/complaints', icon: 'folder_open' },
    { label: 'System Analytics', path: '/superadmin/analytics', icon: 'insights' },
  ];

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    navigate('/login/superadmin');
  };

  const initialLetter = user?.full_name?.charAt(0).toUpperCase() || 'S';

  return (
    <aside className={`${s.sidebar} ${isOpen ? s.sidebarOpen : ''}`}>
      <div className={s.sidebarTop}>
        {/* Brand Link with Constrained Logo */}
        <Link
          to="/superadmin/dashboard"
          className={s.brandLink}
          onClick={handleLinkClick}
          title="CivicSetu Super Admin Command OS"
        >
          <div className={s.brandLogo}>
            <img
              src="/logo-mark.png"
              alt="CivicSetu Logo"
              className={s.brandLogoImg}
            />
          </div>
          <div className={s.brandText}>
            <span className={s.brandName}>CivicSetu</span>
            <span className={s.brandBadge}>
              <span className={s.pulseDot}></span>
              Super Admin OS
            </span>
          </div>
        </Link>

        {/* Portal Switcher */}
        <div className={s.switcherWrapper}>
          <PortalSwitcher />
        </div>

        {/* Navigation Menu */}
        <nav className={s.navSection}>
          <span className={s.sectionHeader}>Executive Controls</span>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`${s.navBtn} ${isActive ? s.activeNavBtn : ''}`}
              >
                <div className={s.navBtnLeft}>
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer User Info & Signout */}
      <div className={s.sidebarFooter}>
        <div className={s.userCard}>
          <div className={s.userAvatar}>
            {initialLetter}
          </div>
          <div className={s.userInfo}>
            <div className={s.userName} title={user?.full_name || 'System Admin'}>
              {user?.full_name || 'System Administrator'}
            </div>
            <div className={s.userRole}>Super Administrator</div>
          </div>
        </div>

        <button
          type="button"
          className={s.logoutBtn}
          onClick={handleLogout}
          title="Sign Out from Super Admin OS"
        >
          <Icon name="logout" size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;
