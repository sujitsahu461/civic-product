import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import authorityService from '../../services/authority.service';
import Icon from '../../components/ui/Icon';
import s from './AuthorityLayout.module.css';

export const AuthorityLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Soft shadow under the pinned header once the page moves
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchUnread = () => {
    authorityService
      .getUnreadCount()
      .then((res) => setUnreadCount(res.unread_count))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    window.addEventListener('focus', fetchUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchUnread);
    };
  }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Dashboard', path: '/authority/dashboard', icon: 'space_dashboard' },
    { label: 'Complaints', path: '/authority/complaints', icon: 'assignment', isHighlight: true },
    { label: 'Analytics', path: '/authority/analytics', icon: 'analytics' },
    { label: 'Notifications', path: '/authority/notifications', icon: 'notifications' },
    { label: 'Profile', path: '/authority/profile', icon: 'person' },
  ];

  // Top bar shows the work pages; the bell covers Notifications and the
  // avatar menu covers Profile. The mobile menu still lists everything.
  const barLinks = navLinks.filter(
    (item) => item.path !== '/authority/notifications' && item.path !== '/authority/profile'
  );

  // Sign out to the landing page. The landing page finishes signing out once
  // it's on screen, so this protected page's "go to login" guard can't win.
  const handleLogout = () => {
    navigate('/', { replace: true, state: { signOut: true } });
  };

  const displayName = user?.full_name ? user.full_name.split(' ')[0] : 'Officer';
  const avatarLetter = user?.full_name ? user.full_name.trim()[0].toUpperCase() : 'O';

  return (
    <div className={s.layoutContainer}>
      {/* ================= TOP NAVBAR ================= */}
      <header className={`${s.navbar} ${scrolled ? s.navbarScrolled : ''}`}>
        <div className={s.navInner}>
          {/* Left: Brand */}
          <Link to="/authority/dashboard" className={s.brandGroup} title="CivicSetu Authority Portal">
            <div className={s.brandLogo}>
              <img src="/logo-mark.png" alt="CivicSetu Logo" className={s.brandLogoImg} />
            </div>
            <span className={s.brandName}>CivicSetu</span>
          </Link>

          {/* Center: one slim segmented bar */}
          <nav className={s.navLinks}>
            {barLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${s.navLink} ${isActive ? s.activeNavLink : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon name={item.icon} size={17} className={s.navIcon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Notification, User Dropdown */}
          <div className={s.navRight}>
            <Link
              to="/authority/notifications"
              className={s.notifBtn}
              title="Notifications"
              aria-label="Notifications"
            >
              <Icon name="notifications" size={20} />
              {unreadCount > 0 && (
                <span className={s.notifBadge}>{unreadCount}</span>
              )}
            </Link>

            <div className={s.userDropdownWrap} ref={dropdownRef}>
              <button
                type="button"
                className={s.userTrigger}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User Menu"
              >
                <div className={s.userAvatar}>{avatarLetter}</div>
                <span className={s.userName}>{displayName}</span>
                <Icon
                  name="expand_more"
                  size={18}
                  className={`${s.chevronIcon} ${dropdownOpen ? s.chevronOpen : ''}`}
                />
              </button>

              {dropdownOpen && (
                <div className={s.dropdownMenu}>
                  <div className={s.dropdownHeader}>
                    <div className={s.dropdownUserName}>{user?.full_name || 'Officer'}</div>
                    <div className={s.dropdownUserEmail}>{user?.email || 'officer@civicsetu.gov'}</div>
                    <div className={s.dropdownDeptTag}>{user?.department || 'Municipal Authority'}</div>
                  </div>

                  <Link to="/authority/dashboard" className={s.dropdownItem}>
                    <Icon name="space_dashboard" size={17} />
                    <span>Dashboard</span>
                  </Link>

                  <Link to="/authority/complaints" className={s.dropdownItem}>
                    <Icon name="assignment" size={17} />
                    <span>Complaints</span>
                  </Link>

                  <Link to="/authority/profile" className={s.dropdownItem}>
                    <Icon name="person" size={17} />
                    <span>Profile</span>
                  </Link>

                  <div className={s.dropdownDivider} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`${s.dropdownItem} ${s.dropdownLogout}`}
                  >
                    <Icon name="logout" size={17} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className={s.mobileMenuBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation"
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className={`${s.mobileMenu} ${mobileMenuOpen ? s.open : ''}`}>
            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`${s.mobileNavLink} ${location.pathname === item.path ? s.mobileNavLinkActive : ''}`}
                aria-current={location.pathname === item.path ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className={`${s.mobileNavLink} ${s.dropdownLogout}`}
              style={{ background: 'transparent', border: 'none', textAlign: 'left', width: '100%' }}
            >
              <Icon name="logout" size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </header>

      {/* ================= MAIN WORKSPACE ================= */}
      <main className={s.mainWorkspace}>
        <Outlet />
      </main>

      {/* ================= FOOTER ================= */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerTop}>
            <div className={s.footerBrand}>
              <div className={s.footerLogoRow}>
                <div className={s.brandLogo} style={{ width: 28, height: 28 }}>
                  <img src="/logo-mark.png" alt="CivicSetu" className={s.brandLogoImg} />
                </div>
                <strong style={{ fontSize: 16, color: 'var(--cs-text-strong)' }}>CivicSetu</strong>
              </div>
              <p className={s.footerDesc}>
                Municipal Authority Grievance Management — AI-powered triage,
                real-time SLA tracking, and automated department routing.
              </p>
            </div>

            <div className={s.footerHelplineBox}>
              <span className={s.helplineTitle}>Authority Support Helplines</span>
              <div className={s.helplineNumbers}>
                <div className={s.helplineItem}>
                  <Icon name="call" size={15} style={{ color: 'var(--cs-kesari-deep)' }} />
                  <span>Municipal Control: <strong>1913</strong></span>
                </div>
                <div className={s.helplineItem}>
                  <Icon name="local_police" size={15} style={{ color: 'var(--cs-maroon)' }} />
                  <span>Emergency: <strong>112</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className={s.footerBottom}>
            <div>
              &copy; {new Date().getFullYear()} CivicSetu. Municipal Authority Grievance Redressal System.
            </div>
            <div className={s.footerLinks}>
              <Link to="/authority/dashboard" className={s.footerLink}>Dashboard</Link>
              <Link to="/authority/complaints" className={s.footerLink}>Complaints</Link>
              <Link to="/authority/analytics" className={s.footerLink}>Analytics</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthorityLayout;
