import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import Icon from '../../components/ui/Icon';
import s from './CitizenLayout.module.css';

export const CitizenLayout: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadNotificationsCount, fetchNotifications } = useComplaintStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        { label: 'Dashboard', path: '/citizen/dashboard', icon: 'dashboard' },
        { label: 'Report Grievance', path: '/citizen/submit', icon: 'add_circle', isHighlight: true },
        { label: 'My Grievances', path: '/citizen/complaints', icon: 'assignment' },
        { label: 'Track Complaint', path: '/citizen/tracking', icon: 'search' },
        { label: 'City Radar Map', path: '/map', icon: 'explore' },
        { label: 'Profile', path: '/citizen/profile', icon: 'person' },
      ]
    : [
        { label: 'Report Grievance', path: '/citizen/submit', icon: 'add_circle', isHighlight: true },
        { label: 'Track Grievance', path: '/citizen/tracking', icon: 'search' },
        { label: 'City Radar Map', path: '/map', icon: 'explore' },
      ];

  const handleLogout = async () => {
    await logout();
    navigate('/login/citizen');
  };

  const displayName = user?.full_name ? user.full_name.split(' ')[0] : 'Citizen';
  const avatarLetter = user?.full_name ? user.full_name.trim()[0].toUpperCase() : 'C';

  return (
    <div className={`${s.layoutContainer} citizenPortalScope`}>
      {/* ================= TOP NAVBAR ================= */}
      <header className={s.navbar}>
        <div className={s.navInner}>
          {/* Left: Brand & Slogan */}
          <Link to={isAuthenticated ? '/citizen/dashboard' : '/'} className={s.brandGroup} title="CivicSetu Gateway">
            <div className={s.brandLogo}>
              <img src="/logo-mark.png" alt="CivicSetu Logo" className={s.brandLogoImg} />
            </div>
            <div className={s.brandText}>
              <div className={s.brandTitleRow}>
                <span className={s.brandName}>CivicSetu</span>
                <span className={s.brandBadge}>
                  <span className={s.pulseDot}></span>
                  {isAuthenticated ? 'Citizen Portal' : 'Public Access'}
                </span>
              </div>
              <span className={s.brandSubtitle}>Connecting Citizens. Improving Communities.</span>
            </div>
          </Link>

          {/* Center: Navigation Links */}
          <nav className={s.navLinks}>
            {navLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${s.navLink} ${isActive ? s.activeNavLink : ''} ${
                    item.isHighlight && !isActive ? s.highlightNavLink : ''
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Notification, User Dropdown / Sign In */}
          <div className={s.navRight}>
            {isAuthenticated ? (
              <>
                <Link
                  to="/citizen/notifications"
                  className={s.notifBtn}
                  title="Grievance Notifications"
                  aria-label="Notifications"
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
                        <div className={s.dropdownUserName}>{user?.full_name || 'Citizen'}</div>
                        <div className={s.dropdownUserEmail}>{user?.email || 'citizen@civicsetu.gov'}</div>
                      </div>

                      <Link to="/citizen/profile" className={s.dropdownItem}>
                        <Icon name="person" size={17} />
                        <span>Profile</span>
                      </Link>

                      <Link to="/citizen/complaints" className={s.dropdownItem}>
                        <Icon name="assignment" size={17} />
                        <span>My Grievances</span>
                      </Link>

                      <Link to="/citizen/notifications" className={s.dropdownItem}>
                        <Icon name="notifications" size={17} />
                        <span>Notifications</span>
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
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login/citizen" className={s.signInBtn}>
                <Icon name="login" size={17} />
                <span>Sign In / Register</span>
              </Link>
            )}

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
                className={s.mobileNavLink}
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
                  <span>Notifications ({unreadNotificationsCount})</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`${s.mobileNavLink} ${s.dropdownLogout}`}
                  style={{ background: 'transparent', border: 'none', textAlign: 'left', width: '100%' }}
                >
                  <Icon name="logout" size={18} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/login/citizen"
                className={s.mobileNavLink}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name="login" size={18} />
                <span>Sign In / Register</span>
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
                  <img src="/logo-mark.png" alt="CivicSetu" className={s.brandLogoImg} />
                </div>
                <strong style={{ fontSize: 16, color: '#0f172a' }}>CivicSetu</strong>
              </div>
              <p className={s.footerDesc}>
                Empowering residents with transparent, AI-triage municipal grievance registration,
                real-time SLA accountability, and automated department routing.
              </p>
            </div>

            <div className={s.footerHelplineBox}>
              <span className={s.helplineTitle}>24x7 Citizen Emergency Helplines</span>
              <div className={s.helplineNumbers}>
                <div className={s.helplineItem}>
                  <Icon name="call" size={15} style={{ color: 'var(--cz-accent-orange, #e89a5b)' }} />
                  <span>Municipal Control: <strong>1913</strong></span>
                </div>
                <div className={s.helplineItem}>
                  <Icon name="local_police" size={15} style={{ color: 'var(--cz-accent-blue, #5b9fcb)' }} />
                  <span>Emergency: <strong>112</strong></span>
                </div>
                <div className={s.helplineItem}>
                  <Icon name="medical_services" size={15} style={{ color: '#4caf7d' }} />
                  <span>Ambulance: <strong>108</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className={s.footerBottom}>
            <div>
              &copy; {new Date().getFullYear()} CivicSetu. Government & Citizen Grievance Redressal System.
            </div>
            <div className={s.footerLinks}>
              <Link to="/citizen/submit" className={s.footerLink}>Report Issue</Link>
              <Link to="/citizen/tracking" className={s.footerLink}>Track Status</Link>
              <Link to="/citizen/complaints" className={s.footerLink}>My Grievances</Link>
              <Link to="/map" className={s.footerLink}>Civic Radar Map</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CitizenLayout;
