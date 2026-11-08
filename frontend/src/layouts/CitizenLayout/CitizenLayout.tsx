import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import Icon from '../../components/ui/Icon';
import s from './CitizenLayout.module.css';

export const CitizenLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { unreadNotificationsCount, fetchNotifications } = useComplaintStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Soft shadow under the pinned header once the page moves
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      window.addEventListener('focus', fetchNotifications);
      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', fetchNotifications);
      };
    }
  }, [isAuthenticated]);

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

  const navLinks = isAuthenticated
    ? [
        { label: t('layout.nav.dashboard'), path: '/citizen/dashboard', icon: 'dashboard' },
        { label: t('layout.nav.reportGrievance'), path: '/citizen/submit', icon: 'add_circle', isHighlight: true },
        { label: t('layout.nav.myGrievances'), path: '/citizen/complaints', icon: 'assignment' },
        { label: t('layout.nav.trackComplaint'), path: '/citizen/tracking', icon: 'search' },
        { label: t('layout.nav.radarMap'), path: '/map', icon: 'explore' },
        { label: t('layout.nav.profile'), path: '/citizen/profile', icon: 'person' },
      ]
    : [
        { label: t('layout.nav.reportGrievance'), path: '/citizen/submit', icon: 'add_circle', isHighlight: true },
        { label: t('layout.nav.trackGrievance'), path: '/citizen/tracking', icon: 'search' },
        { label: t('layout.nav.radarMap'), path: '/map', icon: 'explore' },
      ];

  // Top bar: "Report grievance" becomes the kesari button on the right, and
  // Profile lives in the avatar menu. The mobile menu still lists everything.
  const reportLink = navLinks.find((item) => item.isHighlight);
  const barLinks = navLinks.filter((item) => !item.isHighlight && item.path !== '/citizen/profile');

  // Sign out to the landing page. The landing page finishes signing out once
  // it's on screen, so this protected page's "go to login" guard can't win.
  const handleLogout = () => {
    navigate('/', { replace: true, state: { signOut: true } });
  };

  const displayName = user?.full_name ? user.full_name.split(' ')[0] : t('layout.citizenFallback');
  const avatarLetter = user?.full_name ? user.full_name.trim()[0].toUpperCase() : 'C';

  return (
    <div className={`${s.layoutContainer} citizenPortalScope`}>
      {/* ================= TOP NAVBAR ================= */}
      <header className={`${s.navbar} ${scrolled ? s.navbarScrolled : ''}`}>
        <div className={s.navInner}>
          {/* Left: Brand */}
          <Link to={isAuthenticated ? '/citizen/dashboard' : '/'} className={s.brandGroup} title={t('layout.gatewayTitle')}>
            <div className={s.brandLogo}>
              <img src="/logo-mark.png" alt={t('landing.logoAlt')} className={s.brandLogoImg} />
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

          {/* Right: main action, notifications, user menu / sign in */}
          <div className={s.navRight}>
            {reportLink && (
              <Link
                to={reportLink.path}
                className={`${s.reportBtn} ${location.pathname === reportLink.path ? s.reportBtnActive : ''}`}
                aria-current={location.pathname === reportLink.path ? 'page' : undefined}
              >
                <Icon name="add" size={18} />
                <span>{reportLink.label}</span>
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Link
                  to="/citizen/notifications"
                  className={s.notifBtn}
                  title={t('layout.notificationsTitle')}
                  aria-label={t('layout.notifications')}
                >
                  <Icon name="notifications" size={20} />
                  {unreadNotificationsCount > 0 && (
                    <span className={s.notifBadge}>{unreadNotificationsCount}</span>
                  )}
                </Link>

                <div className={s.userDropdownWrap} ref={dropdownRef}>
                  <button
                    type="button"
                    className={s.userTrigger}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-label={t('layout.userMenu')}
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
                        <div className={s.dropdownUserName}>{user?.full_name || t('layout.citizenFallback')}</div>
                        <div className={s.dropdownUserEmail}>{user?.email || 'citizen@civicsetu.gov'}</div>
                      </div>

                      <Link to="/citizen/profile" className={s.dropdownItem}>
                        <Icon name="person" size={17} />
                        <span>{t('layout.nav.profile')}</span>
                      </Link>

                      <Link to="/citizen/complaints" className={s.dropdownItem}>
                        <Icon name="assignment" size={17} />
                        <span>{t('layout.nav.myGrievances')}</span>
                      </Link>

                      <Link to="/citizen/notifications" className={s.dropdownItem}>
                        <Icon name="notifications" size={17} />
                        <span>{t('layout.notifications')}</span>
                        {unreadNotificationsCount > 0 && (
                          <span className={s.notifBadge} style={{ position: 'static', marginLeft: 'auto' }}>
                            {unreadNotificationsCount}
                          </span>
                        )}
                      </Link>

                      <div className={s.dropdownDivider} />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className={`${s.dropdownItem} ${s.dropdownLogout}`}
                      >
                        <Icon name="logout" size={17} />
                        <span>{t('layout.signOut')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login/citizen" className={s.signInBtn}>
                <Icon name="login" size={17} />
                <span>{t('layout.signInRegister')}</span>
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className={s.mobileMenuBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={t('landing.nav.toggleNav')}
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

            {isAuthenticated ? (
              <>
                <Link
                  to="/citizen/notifications"
                  className={s.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon name="notifications" size={18} />
                  <span>{t('layout.notificationsCount', { n: unreadNotificationsCount })}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`${s.mobileNavLink} ${s.dropdownLogout}`}
                  style={{ background: 'transparent', border: 'none', textAlign: 'left', width: '100%' }}
                >
                  <Icon name="logout" size={18} />
                  <span>{t('layout.signOut')}</span>
                </button>
              </>
            ) : (
              <Link
                to="/login/citizen"
                className={s.mobileNavLink}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name="login" size={18} />
                <span>{t('layout.signInRegister')}</span>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* ================= MAIN WORKSPACE ================= */}
      <main className={s.mainWorkspace}>
        <Outlet />
      </main>

      {/* ================= CIVIC FOOTER ================= */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerTop}>
            <div className={s.footerBrand}>
              <div className={s.footerLogoRow}>
                <div className={s.brandLogo} style={{ width: 28, height: 28 }}>
                  <img src="/logo-mark.png" alt={t('landing.logoAlt')} className={s.brandLogoImg} />
                </div>
                <strong style={{ fontSize: 16, color: 'var(--cs-text-strong)' }}>CivicSetu</strong>
              </div>
              <p className={s.footerDesc}>
                {t('layout.footer.desc')}
              </p>
            </div>

            <div className={s.footerHelplineBox}>
              <span className={s.helplineTitle}>{t('layout.footer.helplineTitle')}</span>
              <div className={s.helplineNumbers}>
                <div className={s.helplineItem}>
                  <Icon name="call" size={15} style={{ color: 'var(--cs-kesari-deep)' }} />
                  <span>{t('layout.footer.municipalControl')} <strong>1913</strong></span>
                </div>
                <div className={s.helplineItem}>
                  <Icon name="local_police" size={15} style={{ color: 'var(--cs-maroon)' }} />
                  <span>{t('layout.footer.emergency')} <strong>112</strong></span>
                </div>
                <div className={s.helplineItem}>
                  <Icon name="medical_services" size={15} style={{ color: 'var(--cs-success)' }} />
                  <span>{t('layout.footer.ambulance')} <strong>108</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className={s.footerBottom}>
            <div>
              {t('layout.footer.copyright', { year: new Date().getFullYear() })}
            </div>
            <div className={s.footerLinks}>
              <Link to="/citizen/submit" className={s.footerLink}>{t('layout.footer.reportIssue')}</Link>
              <Link to="/citizen/tracking" className={s.footerLink}>{t('layout.footer.trackStatus')}</Link>
              <Link to="/citizen/complaints" className={s.footerLink}>{t('layout.footer.myGrievances')}</Link>
              <Link to="/map" className={s.footerLink}>{t('layout.footer.radarMap')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CitizenLayout;
