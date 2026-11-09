import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Icon from './Icon';
import s from './PortalSwitcher.module.css';

export const PortalSwitcher: React.FC = () => {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePortalSwitch = (role: 'CITIZEN' | 'AUTHORITY' | 'SUPER_ADMIN', targetPath: string) => {
    setIsOpen(false);
    if (user?.role === role || user?.role === 'SUPER_ADMIN') {
      navigate(targetPath);
      return;
    }
    if (role === 'CITIZEN') {
      navigate('/login/citizen');
    } else if (role === 'AUTHORITY') {
      navigate('/login/authority');
    } else if (role === 'SUPER_ADMIN') {
      navigate('/login/superadmin');
    } else {
      navigate(targetPath);
    }
  };

  const getPortalDetails = () => {
    if (location.pathname.startsWith('/authority') || user?.role === 'AUTHORITY') {
      return {
        label: 'Authority Portal',
        icon: 'shield',
        colorClass: s.authorityColor,
        currentRole: 'AUTHORITY',
      };
    }
    if (location.pathname.startsWith('/superadmin') || user?.role === 'SUPER_ADMIN') {
      return {
        label: 'Super Admin',
        icon: 'verified_user',
        colorClass: s.adminColor,
        currentRole: 'SUPER_ADMIN',
      };
    }
    return {
      label: 'Citizen Portal',
      icon: 'account_balance',
      colorClass: s.citizenColor,
      currentRole: 'CITIZEN',
    };
  };

  const active = getPortalDetails();

  return (
    <div className={s.container} ref={dropdownRef}>
      <button
        type="button"
        className={s.switchBtn}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        title="Quick Switch Portal"
      >
        <span className={s.portalPill}>
          <Icon name={active.icon} size={15} className={active.colorClass} />
          <span>{active.label}</span>
        </span>
        <Icon
          name="expand_more"
          size={16}
          className={`${s.arrowIcon} ${isOpen ? s.arrowIconOpen : ''}`}
        />
      </button>

      {isOpen && (
        <div className={s.dropdown}>
          <div className={s.dropdownHeader}>Switch Active Portal</div>

          <button
            type="button"
            className={`${s.dropdownItem} ${active.currentRole === 'CITIZEN' ? s.activeItem : ''}`}
            onClick={() => handlePortalSwitch('CITIZEN', '/citizen/dashboard')}
          >
            <div className={s.itemLeft}>
              <Icon name="person" size={16} className={s.citizenColor} />
              <span>Citizen Portal</span>
            </div>
            {active.currentRole === 'CITIZEN' && <span className={s.activeDot}></span>}
          </button>

          <button
            type="button"
            className={`${s.dropdownItem} ${active.currentRole === 'AUTHORITY' ? s.activeItem : ''}`}
            onClick={() => handlePortalSwitch('AUTHORITY', '/authority/dashboard')}
          >
            <div className={s.itemLeft}>
              <Icon name="shield" size={16} className={s.authorityColor} />
              <span>Authority Portal</span>
            </div>
            {active.currentRole === 'AUTHORITY' && <span className={s.activeDot}></span>}
          </button>

          <button
            type="button"
            className={`${s.dropdownItem} ${active.currentRole === 'SUPER_ADMIN' ? s.activeItem : ''}`}
            onClick={() => handlePortalSwitch('SUPER_ADMIN', '/superadmin/dashboard')}
          >
            <div className={s.itemLeft}>
              <Icon name="admin_panel_settings" size={16} className={s.adminColor} />
              <span>Super Admin Portal</span>
            </div>
            {active.currentRole === 'SUPER_ADMIN' && <span className={s.activeDot}></span>}
          </button>
        </div>
      )}
    </div>
  );
};

export default PortalSwitcher;
