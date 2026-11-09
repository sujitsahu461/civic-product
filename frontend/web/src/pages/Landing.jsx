import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RoleModal from '../components/auth/RoleModal';
import useAuthStore from '../store/authStore';
import LanguageSelector from '../components/ui/LanguageSelector';
import s from './Landing.module.css';

const ROW_ICONS = {
  road: '🛣️',
  water: '💧',
  light: '💡',
  drain: '🌊',
  sanitation: '🧹',
};

// Sections the top menu links to, in page order.
const NAV_SECTIONS = [
  { id: 'hero', key: 'product' },
  { id: 'dilemma', key: 'dilemma' },
  { id: 'platform', key: 'platform' },
  { id: 'workflow', key: 'howItWorks' },
  { id: 'integrity', key: 'integrity' },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState('login');
  const [activeSection, setActiveSection] = useState(NAV_SECTIONS[0].id);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  // Arriving from "Sign out" in a portal: finish signing out here, once the
  // protected page is gone (so its "go to login" guard can't redirect us).
  // Then drop the note so a refresh or Back doesn't repeat it.
  useEffect(() => {
    if (!location.state?.signOut) return;
    navigate('/', { replace: true, state: null });
    logout();
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // On scroll: tighten the header and highlight the menu link of the
  // section currently being read.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
      // Current section = the last one whose top has passed 40% of the screen.
      const line = window.innerHeight * 0.4;
      let current = NAV_SECTIONS[0].id;
      NAV_SECTIONS.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      });
      setActiveSection(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Fade blocks up as they scroll into view; cards in a grid follow one another.
  // Skipped when the visitor asks for reduced motion.
  useEffect(() => {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return undefined;
    const staggerGrids = [s.dilemmaGrid, s.workflowGrid, s.trustGrid];
    const groups = [];
    document.querySelectorAll(`.${s.framedContainer} section[id]`).forEach((section) => {
      [...section.children].forEach((child) => {
        const isGrid = staggerGrids.some((c) => child.classList.contains(c));
        groups.push(isGrid ? [...child.children] : [child]);
      });
    });
    const cta = document.querySelector(`.${s.ctaBannerWrapper}`);
    if (cta) groups.push([cta]);

    const timers = [];
    let delivered = false;
    const observer = new IntersectionObserver((entries) => {
      delivered = true;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        el.classList.add(s.revealVisible);
        // Once the fade is done, hand the element back to its own styles
        // so hover transitions aren't slowed by the reveal delay.
        const delay = parseInt(el.style.transitionDelay, 10) || 0;
        timers.push(setTimeout(() => {
          el.classList.remove(s.reveal, s.revealVisible);
          el.style.transitionDelay = '';
        }, 800 + delay));
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });

    groups.forEach((items) => items.forEach((el, i) => {
      el.classList.add(s.reveal);
      el.style.transitionDelay = `${Math.min(i, 4) * 90}ms`;
      observer.observe(el);
    }));

    // Safety net: if the browser never reports visibility (some embedded
    // views do this), show everything rather than leave blank sections.
    const showAllIfStuck = () => {
      if (delivered) return;
      if (document.hidden) {
        timers.push(setTimeout(showAllIfStuck, 1000));
        return;
      }
      observer.disconnect();
      groups.flat().forEach((el) => {
        el.classList.remove(s.reveal, s.revealVisible);
        el.style.transitionDelay = '';
      });
    };
    timers.push(setTimeout(showAllIfStuck, 2000));

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (id === NAV_SECTIONS[0].id) {
      window.scrollTo({ top: 0, behavior });
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior, block: 'start' });
  };

  const under = (h) => t('landing.units.underHours', { h });
  const tier = (n) => t('landing.units.tier', { n });

  const buildRow = (key, data) => {
    const base = `landing.platform.rows.${key}`;
    return {
      ...data,
      title: t(`${base}.title`),
      location: t(`${base}.location`),
      department: t(`${base}.department`),
      status: t(`${base}.status`),
      popover: {
        heading: t(`${base}.popHeading`),
        text: t(`${base}.popText`),
        actionText: t(`${base}.popAction`),
      },
    };
  };

  const registryRows = [
    buildRow('r1', { id: 'CIVIC-8921', kind: 'road', time: t('landing.units.minutesAgo', { n: 12 }), match: '98.4%', priority: 'HIGH', sla: under(24), tier: tier(1) }),
    buildRow('r2', { id: 'CIVIC-8919', kind: 'water', time: t('landing.units.minutesAgo', { n: 34 }), match: '99.1%', priority: 'CRITICAL', sla: under(8), tier: tier(1) }),
    buildRow('r3', { id: 'CIVIC-8914', kind: 'light', time: t('landing.units.hoursAgo', { n: 1 }), match: '96.5%', priority: 'MEDIUM', sla: under(36), tier: tier(2) }),
    buildRow('r4', { id: 'CIVIC-8908', kind: 'drain', time: t('landing.units.hoursAgo', { n: 2 }), match: '97.8%', priority: 'HIGH', sla: under(18), tier: tier(1) }),
    buildRow('r5', { id: 'CIVIC-8896', kind: 'sanitation', time: t('landing.units.hoursAgo', { n: 3 }), match: '95.2%', priority: 'MEDIUM', sla: under(24), tier: tier(2) }),
  ];

  const query = searchQuery.toLowerCase();
  const filteredRows = registryRows.filter((row) =>
    row.title.toLowerCase().includes(query) ||
    row.department.toLowerCase().includes(query) ||
    row.location.toLowerCase().includes(query)
  );

  return (
    <div className={s.pageCanvas}>
      <div className={s.framedContainer}>
        {/* ============================================================
            1. TOP NAVIGATION
            ============================================================ */}
        <header className={`${s.navbar} ${scrolled ? s.navbarScrolled : ''}`}>
          <Link to="/" className={s.navLeft}>
            <div className={s.brandLogoWrap}>
              <img
                src="/civicsetu-logo.png"
                onError={(e) => { e.currentTarget.src = '/static/civicsetu-logo.png'; }}
                alt={t('landing.logoAlt')}
                className={s.brandLogoImg}
              />
            </div>
            <span className={s.brandName}>CivicSetu</span>
          </Link>

          <nav className={s.navCenter}>
            {NAV_SECTIONS.map(({ id, key }) => (
              <button
                key={id}
                type="button"
                className={`${s.navLink} ${activeSection === id ? s.navLinkActive : ''}`}
                aria-current={activeSection === id ? 'location' : undefined}
                onClick={() => scrollToSection(id)}
              >
                {t(`landing.nav.${key}`)}
              </button>
            ))}
            <Link to="/map" className={`${s.navLink} ${s.navLinkLive}`}>
              <span className={s.liveDot} aria-hidden="true" />
              {t('landing.nav.liveMap')}
            </Link>
          </nav>

          <div className={s.navRight}>
            <LanguageSelector className={s.navLang} />
            <button
              type="button"
              className={s.navBtnGhost}
              onClick={() => { setRoleModalMode('login'); setRoleModalOpen(true); }}
            >
              {t('landing.nav.login')}
            </button>
            <button
              type="button"
              className={s.navBtnPrimary}
              onClick={() => { setRoleModalMode('signup'); setRoleModalOpen(true); }}
            >
              {t('landing.nav.signUp')}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              className={s.mobileMenuBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={t('landing.nav.toggleNav')}
            >
              ☰
            </button>
          </div>

          {/* Mobile dropdown (inside the header so it opens under it after scrolling) */}
          {mobileMenuOpen && (
            <div className={s.mobileNavPanel}>
              {NAV_SECTIONS.map(({ id, key }) => (
                <button
                  key={id}
                  type="button"
                  className={`${s.navLink} ${activeSection === id ? s.navLinkActive : ''}`}
                  aria-current={activeSection === id ? 'location' : undefined}
                  onClick={() => scrollToSection(id)}
                >
                  {t(`landing.nav.${key}`)}
                </button>
              ))}
              <Link
                to="/map"
                className={`${s.navLink} ${s.navLinkLive}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className={s.liveDot} aria-hidden="true" />
                {t('landing.nav.liveCityMap')}
              </Link>
              <button type="button" className={s.navBtnGhost} onClick={() => { setMobileMenuOpen(false); setRoleModalMode('login'); setRoleModalOpen(true); }}>{t('landing.nav.login')}</button>
              <button type="button" className={s.navBtnPrimary} onClick={() => { setMobileMenuOpen(false); setRoleModalMode('signup'); setRoleModalOpen(true); }}>{t('landing.nav.signUp')}</button>
            </div>
          )}
        </header>

        {/* ============================================================
            2. HERO SECTION (Editorial Left + 3-Card Composite Right)
            ============================================================ */}
        <section id="hero" className={s.heroSection}>
          {/* Left Column: Bold Headline & Editorial Copy */}
          <div className={s.heroLeft}>
            <div className={s.pillBadge}>
              <span className={s.pillDot} />
              {t('landing.hero.badge')}
            </div>

            <h1 className={s.heroHeading}>
              {t('landing.hero.headingLine1')}<br />
              {t('landing.hero.headingLine2')}<br />
              {t('landing.hero.headingLine3')}
            </h1>

            <p className={s.heroParagraph}>
              {t('landing.hero.paragraph')}
            </p>

            <div className={s.heroActions}>
              <Link to="/citizen/submit" className={s.primaryCtaBtn}>
                {t('landing.hero.reportCta')}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link to="/track" className={s.secondaryCtaBtn}>
                {t('landing.hero.trackCta')}
              </Link>
            </div>
          </div>

          {/* Right Column: 3-Card Composite Product Presentation */}
          <div className={s.heroRight}>
            <div className={s.heroTopRow}>
              {/* Top Left: Incident preview card */}
              <div className={s.incidentCard}>
                <div className={s.incidentImageWrap}>
                  <img
                    src="/civic-hero-city.jpg"
                    onError={(e) => { e.currentTarget.src = '/static/civic-hero-city.jpg'; }}
                    alt={t('landing.hero.incidentImageAlt')}
                    className={s.incidentImage}
                  />
                </div>
                <div className={s.incidentMeta}>
                  <h3 className={s.incidentTitle}>{t('landing.hero.incidentTitle')}</h3>
                  <span className={s.incidentSubtitle}>GEO-28.6139N / 77.2090E</span>
                  <Link to="/map" className={s.incidentLink}>
                    {t('landing.hero.exploreMap')}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Top Right: Metric card in rich green */}
              <div className={s.metricCard}>
                <div>
                  <div className={s.metricTop}>
                    <div className={s.metricPills}>
                      <span className={s.metricMiniTag}>{t('landing.hero.tagAiTriage')}</span>
                      <span className={s.metricMiniTag}>{t('landing.hero.tagWardDispatch')}</span>
                    </div>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className={s.metricValue}>94%</div>
                  <p className={s.metricLabel}>{t('landing.hero.metricLabel')}</p>
                </div>
                <div className={s.metricFooter}>
                  <span>{t('landing.hero.targetSla')}</span>
                  <span>{t('landing.hero.efficiency')}</span>
                </div>
              </div>
            </div>

            {/* Bottom: Overview & Department Routing Card */}
            <div className={s.overviewCard}>
              <div className={s.overviewHeader}>
                <span className={s.overviewTitle}>{t('landing.hero.overviewTitle')}</span>
                <span className={s.bestOptionBadge}>{t('landing.hero.bestRoute')}</span>
              </div>

              <div className={s.bestOptionBox}>
                <div className={s.bestOptionDept}>
                  <div className={s.bestOptionDot} />
                  <div>
                    <div className={s.bestOptionName}>{t('landing.hero.bestDept')}</div>
                    <div className={s.bestOptionWard}>{t('landing.hero.bestWard')}</div>
                  </div>
                </div>
                <span className={s.bestOptionBadge}>{t('landing.hero.matchBadge')}</span>
              </div>

              <div className={s.scoreRow}>
                <div className={s.scoreItem}>
                  <span className={s.scoreValue}>98</span>
                  <span className={s.scoreDesc}>{t('landing.hero.confidenceScore')}</span>
                </div>
                <div className={s.scoreItem}>
                  <span className={s.scoreValue}>{under(24)}</span>
                  <span className={s.scoreDesc}>{t('landing.hero.policySla')}</span>
                </div>
                <div className={s.scoreItem}>
                  <span className={s.scoreValue}>{tier(1)}</span>
                  <span className={s.scoreDesc}>{t('landing.hero.emergencyDispatch')}</span>
                </div>
              </div>

              <div className={s.otherOptions}>
                <span className={s.otherOptionsLabel}>{t('landing.hero.otherEvaluations')}</span>
                <div className={s.otherOptionItem}>
                  <span>{t('landing.hero.sanitationCell')}</span>
                  <span className={s.otherOptionBadge}>{t('landing.hero.sanitationScore')}</span>
                </div>
                <div className={s.otherOptionItem}>
                  <span>{t('landing.hero.waterBoard')}</span>
                  <span className={s.otherOptionBadge}>{t('landing.hero.waterScore')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            3. PROBLEM SECTION ("Civic Dilemma")
            ============================================================ */ }
        <section id="dilemma" className={s.dilemmaSection}>
          <div className={s.dilemmaHeader}>
            <div className={`${s.pillBadge} ${s.pillBadgeDilemma}`}>
              <span className={s.pillDot} />
              {t('landing.dilemma.badge')}
            </div>
            <h2 className={s.sectionHeadline}>
              {t('landing.dilemma.headline')}
            </h2>
            <p className={s.sectionSubtext}>
              {t('landing.dilemma.subtext')}
            </p>
          </div>

          <div className={s.dilemmaGrid}>
            <div className={s.dilemmaCard}>
              <div className={s.dilemmaIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <h3 className={s.dilemmaCardTitle}>{t('landing.dilemma.card1Title')}</h3>
              <p className={s.dilemmaCardText}>
                {t('landing.dilemma.card1Text')}
              </p>
            </div>

            <div className={s.dilemmaCard}>
              <div className={s.dilemmaIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 3h5v5" />
                  <path d="M4 20L21 3" />
                  <path d="M21 16v5h-5" />
                  <path d="M15 15l6 6" />
                  <path d="M4 4l5 5" />
                </svg>
              </div>
              <h3 className={s.dilemmaCardTitle}>{t('landing.dilemma.card2Title')}</h3>
              <p className={s.dilemmaCardText}>
                {t('landing.dilemma.card2Text')}
              </p>
            </div>

            <div className={s.dilemmaCard}>
              <div className={s.dilemmaIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3 className={s.dilemmaCardTitle}>{t('landing.dilemma.card3Title')}</h3>
              <p className={s.dilemmaCardText}>
                {t('landing.dilemma.card3Text')}
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================
            4. ONE PLATFORM SHOWCASE (The Grievance Registry Window)
            ============================================================ */}
        <section id="platform" className={s.platformSection}>
          <div className={s.platformHeader}>
            <div className={s.pillBadge}>
              <span className={s.pillDot} />
              {t('landing.platform.badge')}
            </div>
            <h2 className={s.sectionHeadline}>
              {t('landing.platform.headline')}
            </h2>
            <p className={s.sectionSubtext}>
              {t('landing.platform.subtext')}
            </p>
          </div>

          {/* Master Registry Window Mockup */}
          <div className={s.registryWindow}>
            {/* Dark Sidebar */}
            <div className={s.registrySidebar}>
              <div>
                <div className={s.sidebarBrand}>
                  <div className={s.sidebarBrandLogoWrap}>
                    <img
                      src="/civicsetu-logo.png"
                      onError={(e) => { e.currentTarget.src = '/static/civicsetu-logo.png'; }}
                      alt={t('landing.logoAlt')}
                      className={s.brandLogoImg}
                    />
                  </div>
                  <span className={s.sidebarBrandText}>CivicSetu</span>
                </div>

                <div className={s.sidebarNav}>
                  <div className={s.sidebarItem} onClick={() => navigate('/citizen/dashboard')} style={{ cursor: 'pointer' }} title={t('landing.platform.sidebar.dashboardTitle')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                    {t('landing.platform.sidebar.dashboard')}
                  </div>
                  <div className={`${s.sidebarItem} ${s.sidebarItemActive}`} onClick={() => navigate('/citizen/complaints')} style={{ cursor: 'pointer' }} title={t('landing.platform.sidebar.grievancesTitle')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                    {t('landing.platform.sidebar.grievances')}
                    <span className={s.sidebarItemCount}>24</span>
                  </div>
                  <div className={s.sidebarItem} onClick={() => navigate('/map')} style={{ cursor: 'pointer' }} title={t('landing.platform.sidebar.mapTitle')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
                    {t('landing.nav.liveCityMap')}
                  </div>
                  <div className={s.sidebarItem} onClick={() => navigate('/authority/dashboard')} style={{ cursor: 'pointer' }} title={t('landing.platform.sidebar.departmentsTitle')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    {t('landing.platform.sidebar.departments')}
                  </div>
                  <div className={s.sidebarItem} onClick={() => navigate('/superadmin/analytics')} style={{ cursor: 'pointer' }} title={t('landing.platform.sidebar.analyticsTitle')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                    {t('landing.platform.sidebar.analytics')}
                  </div>
                </div>
              </div>

              <div className={s.sidebarUser} onClick={() => navigate('/login/authority')} style={{ cursor: 'pointer' }} title={t('landing.platform.sidebar.authorityLoginTitle')}>
                <div className={s.sidebarAvatar}>RM</div>
                <div className={s.sidebarUserInfo}>
                  <span className={s.sidebarUserName}>{t('landing.platform.sidebar.userName')}</span>
                  <span className={s.sidebarUserRole}>{t('landing.platform.sidebar.userRole')}</span>
                </div>
              </div>
            </div>

            {/* Registry Content Table */}
            <div className={s.registryContent}>
              <div className={s.registryTopBar}>
                <div className={s.registryHeadingGroup}>
                  <h3 className={s.registryTitle}>{t('landing.platform.registryTitle')}</h3>
                  <span className={s.registrySub}>{t('landing.platform.registrySub')}</span>
                </div>

                <div className={s.registryControls}>
                  <div className={s.registrySearch}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                      type="text"
                      placeholder={t('landing.platform.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Link to="/citizen/submit" className={s.registryBtnAdd}>
                    {t('landing.platform.newGrievance')}
                  </Link>
                </div>
              </div>

              <table className={s.registryTable}>
                <thead>
                  <tr>
                    <th>{t('landing.platform.table.details')}</th>
                    <th>{t('landing.platform.table.reported')}</th>
                    <th>{t('landing.platform.table.aiMatch')}</th>
                    <th>{t('landing.platform.table.department')}</th>
                    <th>{t('landing.platform.table.priority')}</th>
                    <th>{t('landing.platform.table.slaTarget')}</th>
                    <th>{t('landing.platform.table.routing')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={s.registryTableRow}
                      onMouseEnter={() => setActiveRow(index)}
                      style={{ background: activeRow === index ? '#FFFBF2' : 'transparent' }}
                    >
                      <td>
                        <div className={s.itemMain}>
                          <div className={s.itemIconThumb}>
                            {ROW_ICONS[row.kind]}
                          </div>
                          <div>
                            <div className={s.itemTitleBold}>{row.title}</div>
                            <div className={s.itemSubLoc}>{row.location}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#7D6657', fontSize: '12px' }}>{row.time}</td>
                      <td>
                        <span className={s.matchPill}>{row.match}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{row.department}</td>
                      <td>
                        <span
                          className={
                            row.priority === 'CRITICAL'
                              ? s.priorityCritical
                              : row.priority === 'HIGH'
                              ? s.priorityHigh
                              : s.priorityMedium
                          }
                        >
                          {t(`landing.platform.priority.${row.priority}`)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.sla}</td>
                      <td>
                        <button
                          type="button"
                          className={`${s.tierPill} ${activeRow === index ? s.tierPillActive : ''}`}
                          onClick={() => setActiveRow(index)}
                        >
                          {row.tier} • {row.status}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Popover Detail Card (Interactive Keyvo Signature) */}
              {registryRows[activeRow] && (
                <div className={s.registryPopover}>
                  <div className={s.popoverTier}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E7D4F" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {registryRows[activeRow].popover.heading}
                  </div>
                  <p className={s.popoverText}>
                    {registryRows[activeRow].popover.text}
                  </p>
                  <Link to="/track" className={s.popoverDetails}>
                    {registryRows[activeRow].popover.actionText} →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 4 Feature Columns below Registry */}
          <div className={s.platformFeatureRow}>
            <div className={s.featCol}>
              <div className={s.featColIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <h4 className={s.featColTitle}>{t('landing.platform.features.f1Title')}</h4>
              <p className={s.featColDesc}>
                {t('landing.platform.features.f1Desc')}
              </p>
            </div>

            <div className={s.featCol}>
              <div className={s.featColIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
              </div>
              <h4 className={s.featColTitle}>{t('landing.platform.features.f2Title')}</h4>
              <p className={s.featColDesc}>
                {t('landing.platform.features.f2Desc')}
              </p>
            </div>

            <div className={s.featCol}>
              <div className={s.featColIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
              <h4 className={s.featColTitle}>{t('landing.platform.features.f3Title')}</h4>
              <p className={s.featColDesc}>
                {t('landing.platform.features.f3Desc')}
              </p>
            </div>

            <div className={s.featCol}>
              <div className={s.featColIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <h4 className={s.featColTitle}>{t('landing.platform.features.f4Title')}</h4>
              <p className={s.featColDesc}>
                {t('landing.platform.features.f4Desc')}
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================
            5. WORKFLOW SECTION ("How CivicSetu Fits into your Workflow")
            ============================================================ */}
        <section id="workflow" className={s.workflowSection}>
          <div className={s.workflowGrid}>
            <div className={s.workflowLeft}>
              <div className={s.pillBadge}>
                <span className={s.pillDot} />
                {t('landing.workflow.badge')}
              </div>
              <h2 className={s.workflowLeftHeading}>
                {t('landing.workflow.headingLine1')}<br />
                {t('landing.workflow.headingLine2')}<br />
                {t('landing.workflow.headingLine3')}
              </h2>
              <p className={s.workflowLeftDesc}>
                {t('landing.workflow.desc')}
              </p>
              <Link to="/citizen/submit" className={s.primaryCtaBtn}>
                {t('landing.workflow.reportIssue')}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className={s.workflowSteps}>
              {/* Step 1 */}
              <div className={s.stepCard}>
                <div className={s.stepPreviewBox}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ height: '8px', background: '#EADFCB', borderRadius: '4px', width: '80%' }} />
                    <div style={{ height: '8px', background: '#F3E9D8', borderRadius: '4px', width: '60%' }} />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', background: '#F7EFE1', padding: '3px 8px', borderRadius: '4px' }}>{t('landing.workflow.geotagAdded')}</span>
                      <span style={{ fontSize: '11px', background: '#F7EFE1', padding: '3px 8px', borderRadius: '4px' }}>{t('landing.workflow.photoProof')}</span>
                    </div>
                  </div>
                </div>
                <div className={s.stepNumber}>{t('landing.workflow.step', { n: 1 })}</div>
                <p className={s.stepCardText}>
                  {t('landing.workflow.step1Text')}
                </p>
              </div>

              {/* Step 2 */}
              <div className={s.stepCard}>
                <div className={s.stepPreviewBox}>
                  <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #EADFCB' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#7A1F2B', marginBottom: '4px' }}>{t('landing.workflow.triageMatrix')}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600' }}>{t('landing.workflow.triageDept')}</div>
                    <div style={{ fontSize: '11px', color: '#B42318', marginTop: '2px' }}>{t('landing.workflow.triageUrgency')}</div>
                  </div>
                </div>
                <div className={s.stepNumber}>{t('landing.workflow.step', { n: 2 })}</div>
                <p className={s.stepCardText}>
                  {t('landing.workflow.step2Text')}
                </p>
              </div>

              {/* Step 3 */}
              <div className={s.stepCard}>
                <div className={s.stepPreviewBox}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600' }}>
                      <span>{t('landing.workflow.wardPwd')}</span>
                      <span style={{ color: '#1F6B3F' }}>{t('landing.workflow.dispatched')}</span>
                    </div>
                    <div style={{ height: '6px', background: '#2E7D4F', borderRadius: '3px', width: '100%' }} />
                    <span style={{ fontSize: '10.5px', color: '#7D6657' }}>{t('landing.workflow.citizenNotified')}</span>
                  </div>
                </div>
                <div className={s.stepNumber}>{t('landing.workflow.step', { n: 3 })}</div>
                <p className={s.stepCardText}>
                  {t('landing.workflow.step3Text')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            6. ENTERPRISE / TRUST SECURITY ("Trust engineered into every resolution")
            ============================================================ */}
        <section id="integrity" className={s.trustSection}>
          <div className={s.trustHeader}>
            <div className={s.pillBadge}>
              <span className={s.pillDot} />
              {t('landing.trust.badge')}
            </div>
            <h2 className={s.sectionHeadline}>
              {t('landing.trust.headline')}
            </h2>
            <p className={s.sectionSubtext}>
              {t('landing.trust.subtext')}
            </p>
          </div>

          <div className={s.trustGrid}>
            <div className={s.trustCard}>
              <div className={s.trustCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <h4 className={s.trustCardTitle}>{t('landing.trust.c1Title')}</h4>
              <p className={s.trustCardDesc}>
                {t('landing.trust.c1Desc')}
              </p>
            </div>

            <div className={s.trustCard}>
              <div className={s.trustCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 12l-4-4-4 4M12 16V9" /></svg>
              </div>
              <h4 className={s.trustCardTitle}>{t('landing.trust.c2Title')}</h4>
              <p className={s.trustCardDesc}>
                {t('landing.trust.c2Desc')}
              </p>
            </div>

            <div className={s.trustCard}>
              <div className={s.trustCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>
              </div>
              <h4 className={s.trustCardTitle}>{t('landing.trust.c3Title')}</h4>
              <p className={s.trustCardDesc}>
                {t('landing.trust.c3Desc')}
              </p>
            </div>

            <div className={s.trustCard}>
              <div className={s.trustCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              </div>
              <h4 className={s.trustCardTitle}>{t('landing.trust.c4Title')}</h4>
              <p className={s.trustCardDesc}>
                {t('landing.trust.c4Desc')}
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================
            7. BIG GREEN HERO CTA BANNER (Keyvo Signature 00:24 - 00:27)
            ============================================================ */}
        <div className={s.ctaBannerWrapper}>
          <div className={s.ctaGreenBanner}>
            <div className={s.ctaLeft}>
              <div className={`${s.pillBadge} ${s.pillBadgeWhite}`}>
                <span className={s.pillDot} />
                {t('landing.cta.badge')}
              </div>
              <h2 className={s.ctaHeading}>
                {t('landing.cta.heading')}
              </h2>
            </div>

            <div className={s.ctaRight}>
              <p className={s.ctaSubtext}>
                {t('landing.cta.subtext')}
              </p>

              <div
                className={s.ctaTabletCard}
                onClick={() => navigate('/citizen/submit')}
                style={{ cursor: 'pointer' }}
                title={t('landing.cta.tabletTooltip')}
              >
                <div className={s.ctaTabletLogoWrap}>
                  <img
                    src="/civicsetu-logo.png"
                    onError={(e) => { e.currentTarget.src = '/static/civicsetu-logo.png'; }}
                    alt={t('landing.cta.appAlt')}
                    className={s.brandLogoImg}
                  />
                </div>
                <div className={s.ctaTabletInfo}>
                  <span className={s.ctaTabletTitle}>{t('landing.cta.tabletTitle')}</span>
                  <span className={s.ctaTabletDesc}>{t('landing.cta.tabletDesc')}</span>
                </div>
              </div>

              <div className={s.ctaButtonRow}>
                <Link to="/citizen/submit" className={s.ctaBtnBlack}>
                  {t('landing.workflow.reportIssue')}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/track" className={s.ctaBtnWhite}>
                  {t('landing.hero.trackCta')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            8. FOOTER WITH GIGANTIC TYPOGRAPHY WORDMARK (Keyvo 00:28 - 00:29)
            ============================================================ */}
        <footer className={s.footerSection}>
          <div className={s.footerTopRow}>
            <div className={s.footerBrandLeft}>
              <div className={s.footerLogoWrap}>
                <img
                  src="/civicsetu-logo.png"
                  onError={(e) => { e.currentTarget.src = '/static/civicsetu-logo.png'; }}
                  alt={t('landing.logoAlt')}
                  className={s.brandLogoImg}
                />
              </div>
              <span className={s.footerCopyright}>{t('landing.footer.copyright')}</span>
            </div>

            <div className={s.footerLinks}>
              <button type="button" className={s.footerLink} onClick={() => scrollToSection('hero')}>{t('landing.nav.product')}</button>
              <button type="button" className={s.footerLink} onClick={() => scrollToSection('workflow')}>{t('landing.nav.howItWorks')}</button>
              <Link to="/citizen/submit" className={s.footerLink}>{t('landing.footer.reportGrievance')}</Link>
              <Link to="/track" className={s.footerLink}>{t('landing.footer.trackComplaint')}</Link>
              <Link to="/map" className={s.footerLink}>{t('landing.nav.liveCityMap')}</Link>
              <Link to="/login/authority" className={s.footerLink}>{t('landing.footer.municipalLogin')}</Link>
              <button
                type="button"
                className={s.footerLink}
                onClick={() => { setRoleModalMode('login'); setRoleModalOpen(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
              >
                {t('landing.footer.rolePortals')}
              </button>
            </div>
          </div>

          <div
            className={s.giantWordmarkRow}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ cursor: 'pointer' }}
            title={t('landing.footer.scrollTop')}
          >
            <div className={s.giantLogoBridge}>
              <img
                src="/civicsetu-logo.png"
                onError={(e) => { e.currentTarget.src = '/static/civicsetu-logo.png'; }}
                alt={t('landing.footer.officialLogoAlt')}
                className={s.giantLogoImg}
              />
            </div>
            <h1 className={s.giantWordmarkText}>CivicSetu</h1>
          </div>
        </footer>
      </div>

      {/* Role Selection Modal for Login/Signup */}
      <RoleModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        defaultMode={roleModalMode}
      />
    </div>
  );
}
