import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/ui/Icon';
import s from './SuperAdminLayout.module.css';

export const SuperAdminLayout: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'audit' | 'settings' | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Soft shadow under the pinned header once the page moves
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Sign out to the landing page. The landing page finishes signing out once
  // it's on screen, so this protected page's "go to login" guard can't win.
  const handleLogout = () => {
    navigate('/', { replace: true, state: { signOut: true } });
  };

  const navLinks = [
    { label: 'Dashboard', path: '/superadmin/dashboard', icon: 'space_dashboard' },
    { label: 'Users', path: '/superadmin/users', icon: 'group' },
    { label: 'Authorities', path: '/superadmin/authorities', icon: 'account_balance' },
    { label: 'Departments', path: '/superadmin/departments', icon: 'corporate_fare' },
    { label: 'Complaints', path: '/superadmin/complaints', icon: 'assignment' },
    { label: 'Analytics', path: '/superadmin/analytics', icon: 'analytics' },
    { label: 'Audit Logs', path: '#audit', icon: 'receipt_long', isModal: 'audit' },
    { label: 'Settings', path: '#settings', icon: 'settings', isModal: 'settings' },
  ];

  // Top bar shows the pages; Audit Logs and Settings open panels, so they
  // live in the avatar menu (the bell also opens Audit Logs).
  // The mobile menu still lists everything.
  const barLinks = navLinks.filter((item) => !item.isModal);
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Admin';

  const isUserDirectory = location.pathname.startsWith('/superadmin/users');
  const isAnalyticsPage = location.pathname.startsWith('/superadmin/analytics');
  const isFluidPage = isUserDirectory || isAnalyticsPage;

  return (
    <div className={s.layoutContainer}>
      {/* ================= TOP NAVBAR ================= */}
      <header className={`${s.navbar} ${scrolled ? s.navbarScrolled : ''}`}>
        <div className={`${s.navInner} ${isFluidPage ? s.navInnerFluid : ''}`}>
          {/* Left: Brand */}
          <Link to="/superadmin/dashboard" className={s.brandGroup} title="CivicSetu Super Admin Portal">
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

          {/* Right: User Controls & Notification */}
          <div className={s.navRight}>
            {/* Notification Bell with red badge */}
            <button
              type="button"
              className={s.notifBtn}
              onClick={() => setActiveModal('audit')}
              title="6 System Notifications"
              aria-label="Notifications"
            >
              <Icon name="notifications" size={19} />
              <span className={s.notifBadge}>6</span>
            </button>

            {/* Super Admin User Dropdown */}
            <div className={s.userDropdownWrap} ref={dropdownRef}>
              <button
                type="button"
                className={s.userTrigger}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User Menu"
              >
                <div className={s.userAvatar}>{user?.full_name ? user.full_name[0].toUpperCase() : 'S'}</div>
                <span className={s.userName}>{firstName}</span>
                <Icon
                  name="expand_more"
                  size={18}
                  className={`${s.chevronIcon} ${dropdownOpen ? s.chevronOpen : ''}`}
                />
              </button>

              {dropdownOpen && (
                <div className={s.dropdownMenu}>
                  <div className={s.dropdownHeader}>
                    <div className={s.dropdownUserName}>{user?.full_name || 'Super Admin'}</div>
                    <div className={s.dropdownUserEmail}>{user?.email || 'admin@civicsetu.gov.in'}</div>
                    <div className={s.dropdownDeptTag}>Municipal Platform Administration</div>
                  </div>

                  <Link
                    to="/superadmin/dashboard"
                    className={s.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Icon name="space_dashboard" size={17} />
                    <span>Admin Dashboard</span>
                  </Link>

                  <Link
                    to="/superadmin/users"
                    className={s.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Icon name="group" size={17} />
                    <span>User Directory</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setActiveModal('settings');
                    }}
                    className={s.dropdownItem}
                  >
                    <Icon name="tune" size={17} />
                    <span>Platform Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setActiveModal('audit');
                    }}
                    className={s.dropdownItem}
                  >
                    <Icon name="receipt_long" size={17} />
                    <span>Audit Logs</span>
                  </button>

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
            {navLinks.map((item) => {
              if (item.isModal) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={s.mobileNavLink}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActiveModal(item.isModal as 'audit' | 'settings');
                    }}
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
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
              );
            })}
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
      <main className={`${s.mainWorkspace} ${isFluidPage ? s.mainWorkspaceUserPage : ''}`}>
        <Outlet />
      </main>

      {/* ================= AUDIT LOGS MODAL ================= */}
      {activeModal === 'audit' && (
        <div className={s.modalBackdrop} onClick={() => setActiveModal(null)}>
          <div className={s.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div className={s.modalTitleWrap}>
                <div className={s.modalIconBox} style={{ background: 'var(--cs-haldi-tint)', color: 'var(--cs-haldi-text)' }}>
                  <Icon name="receipt_long" size={20} />
                </div>
                <div>
                  <h3 className={s.modalTitle}>System Audit & Security Logs</h3>
                  <p className={s.modalSub}>Immutable cryptographic event log for municipal administration</p>
                </div>
              </div>
              <button
                type="button"
                className={s.modalCloseBtn}
                onClick={() => setActiveModal(null)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className={s.modalBody}>
              <div className={s.auditList}>
                {[
                  { id: 'ACT-20250922-0142', user: 'superadmin', action: 'Created User', details: 'New authority user created: bmc_officer@rourkela.gov.in', module: 'User Management', time: '22 Sep 2025, 10:22 AM', status: 'Success' },
                  { id: 'ACT-20250922-0141', user: 'superadmin', action: 'Updated Department', details: 'Updated category mapping for Sanitation', module: 'Departments', time: '22 Sep 2025, 09:18 AM', status: 'Success' },
                                  { id: 'ACT-20250922-0139', user: 'superadmin', action: 'Onboarded Authority', details: 'Bargarh Municipal Council added', module: 'Authorities', time: '22 Sep 2025, 06:30 AM', status: 'Success' },
                  { id: 'ACT-20250922-0138', user: 'system', action: 'Completed Backup', details: 'Daily database backup completed', module: 'System', time: '22 Sep 2025, 02:15 AM', status: 'Success' },
                  { id: 'ACT-20250921-0137', user: 'superadmin', action: 'Modified SLA Policy', details: 'Adjusted Road Hazard resolution window to 24 hours', module: 'Governance', time: '21 Sep 2025, 04:12 PM', status: 'Success' },
                ].map((log) => (
                  <div key={log.id} className={s.auditItem}>
                    <div className={s.auditMain}>
                      <span className={s.auditId}>{log.id}</span>
                      <span className={s.auditAction}>{log.action}</span>
                      <span className={s.auditDetails}>{log.details}</span>
                      <span className={s.auditMeta}>{log.module} • {log.user}</span>
                    </div>
                    <div className={s.auditRight}>
                      <span className={s.auditTime}>{log.time}</span>
                      <span className={s.auditBadgeSuccess}>✓ {log.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.btnPrimary}
                onClick={() => setActiveModal(null)}
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SETTINGS MODAL ================= */}
      {activeModal === 'settings' && (
        <div className={s.modalBackdrop} onClick={() => setActiveModal(null)}>
          <div className={s.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div className={s.modalTitleWrap}>
                <div className={s.modalIconBox} style={{ background: 'var(--cs-kesari-tint)', color: 'var(--cs-maroon)' }}>
                  <Icon name="tune" size={20} />
                </div>
                <div>
                  <h3 className={s.modalTitle}>Platform System Configuration</h3>
                  <p className={s.modalSub}>National civic services gateway parameters & integrations</p>
                </div>
              </div>
              <button
                type="button"
                className={s.modalCloseBtn}
                onClick={() => setActiveModal(null)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className={s.modalBody}>
              <div className={s.settingsGrid}>
                <div className={s.settingRow}>
                  <div>
                    <div className={s.settingName}>SMS / WhatsApp Citizen Alerts</div>
                    <div className={s.settingDesc}>Deliver real-time dispatch and resolution notifications</div>
                  </div>
                  <span className={s.activePill}>Connected</span>
                </div>

                <div className={s.settingRow}>
                  <div>
                    <div className={s.settingName}>High-Res GIS Tile Server</div>
                    <div className={s.settingDesc}>OpenStreetMap Standard & Esri World Street fallback</div>
                  </div>
                  <span className={s.activePill}>Active (Zero-Lag)</span>
                </div>

                <div className={s.settingRow}>
                  <div>
                    <div className={s.settingName}>Daily Automated Database Backup</div>
                    <div className={s.settingDesc}>Next scheduled execution at 02:00 AM IST</div>
                  </div>
                  <span className={s.activePill}>Scheduled</span>
                </div>
              </div>
            </div>

            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.btnPrimary}
                onClick={() => setActiveModal(null)}
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminLayout;
