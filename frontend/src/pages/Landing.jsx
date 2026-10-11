import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import RoleModal from '../components/auth/RoleModal';
import s from './Landing.module.css';

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState('login');

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const registryRows = [
    {
      id: 'CIVIC-8921',
      title: 'Deep Hazardous Pothole & Caving',
      location: 'Ward 12 • Ring Road West',
      time: '12m ago',
      match: '98.4%',
      department: 'Roads & Infrastructure',
      priority: 'HIGH',
      sla: '< 24h',
      tier: 'Tier 1',
      status: 'Auto-Routed',
      popover: {
        heading: 'Tier 1 • Road & Infrastructure',
        text: 'AI Classification: High-risk commuter road hazard. Routed to Ward 12 PWD Quick Response Team.',
        actionText: 'View Details',
      },
    },
    {
      id: 'CIVIC-8919',
      title: 'Main Drinking Pipeline Rupture',
      location: 'Ward 07 • Sector 4 Market',
      time: '34m ago',
      match: '99.1%',
      department: 'Water Board Division',
      priority: 'CRITICAL',
      sla: '< 8h',
      tier: 'Tier 1',
      status: 'Dispatched',
      popover: {
        heading: 'Tier 1 • Water Board Emergency',
        text: 'Severe clean water loss detected. Emergency repair vehicle dispatched with estimated arrival in 25m.',
        actionText: 'Track Crew',
      },
    },
    {
      id: 'CIVIC-8914',
      title: 'Cluster of 8 Dark Streetlights',
      location: 'Ward 22 • Metro Flyover Path',
      time: '1h ago',
      match: '96.5%',
      department: 'Electrical & Lighting',
      priority: 'MEDIUM',
      sla: '< 36h',
      tier: 'Tier 2',
      status: 'Scheduled',
      popover: {
        heading: 'Tier 2 • Electrical Maintenance',
        text: 'Multiple circuit failure reported. Night maintenance squad scheduled for 20:00 inspection.',
        actionText: 'View Shift',
      },
    },
    {
      id: 'CIVIC-8908',
      title: 'Stormwater Drain Overflow & Sludge',
      location: 'Ward 11 • Subhash Nagar',
      time: '2h ago',
      match: '97.8%',
      department: 'Stormwater Drainage',
      priority: 'HIGH',
      sla: '< 18h',
      tier: 'Tier 1',
      status: 'In Progress',
      popover: {
        heading: 'Tier 1 • Stormwater Cell',
        text: 'Drain blockage creating surface flood hazard. Suction pump team en route.',
        actionText: 'Inspect Log',
      },
    },
    {
      id: 'CIVIC-8896',
      title: 'Commercial Waste Dump on Sidewalk',
      location: 'Ward 03 • Station Road',
      time: '3h ago',
      match: '95.2%',
      department: 'Sanitation & Solid Waste',
      priority: 'MEDIUM',
      sla: '< 24h',
      tier: 'Tier 2',
      status: 'Queued',
      popover: {
        heading: 'Tier 2 • Sanitation Desk',
        text: 'Bulk garbage accumulation ticket confirmed. Added to morning collection route truck #14.',
        actionText: 'View Ward',
      },
    },
  ];

  const filteredRows = registryRows.filter((row) =>
    row.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={s.pageCanvas}>
      <div className={s.framedContainer}>
        {/* ============================================================
            1. TOP NAVIGATION
            ============================================================ */}
        <header className={s.navbar}>
          <Link to="/" className={s.navLeft}>
            <div className={s.brandLogoWrap}>
              <img
                src="/civicsetu-logo.png"
                onError={(e) => { e.currentTarget.src = '/static/civicsetu-logo.png'; }}
                alt="CivicSetu Logo"
                className={s.brandLogoImg}
              />
            </div>
            <span className={s.brandName}>CivicSetu</span>
          </Link>

          <nav className={s.navCenter}>
            <button type="button" className={s.navLink} onClick={() => scrollToSection('hero')}>Product</button>
            <button type="button" className={s.navLink} onClick={() => scrollToSection('dilemma')}>Dilemma</button>
            <button type="button" className={s.navLink} onClick={() => scrollToSection('platform')}>Platform</button>
            <button type="button" className={s.navLink} onClick={() => scrollToSection('workflow')}>How It Works</button>
            <button type="button" className={s.navLink} onClick={() => scrollToSection('integrity')}>Integrity</button>
            <Link to="/map" className={s.navLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 600, textDecoration: 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)' }} />
              Live Map
            </Link>
          </nav>

          <div className={s.navRight}>
            <button
              type="button"
              className={s.navBtnGhost}
              onClick={() => { setRoleModalMode('login'); setRoleModalOpen(true); }}
            >
              Login
            </button>
            <button
              type="button"
              className={s.navBtnPrimary}
              onClick={() => { setRoleModalMode('signup'); setRoleModalOpen(true); }}
            >
              Sign Up
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              className={s.mobileMenuBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation"
            >
              ☰
            </button>
          </div>
        </header>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className={s.mobileNavPanel}>
            <div className={s.mobileNavBrand}>
              <div className={s.brandLogoWrap}>
                <img
                  src="/civicsetu-logo.png"
                  onError={(e) => { e.currentTarget.src = '/static/civicsetu-logo.png'; }}
                  alt="CivicSetu Logo"
                  className={s.brandLogoImg}
                />
              </div>
              <span className={s.brandName}>CivicSetu</span>
            </div>
            <button type="button" className={s.navLink} onClick={() => scrollToSection('hero')}>Product</button>
            <button type="button" className={s.navLink} onClick={() => scrollToSection('dilemma')}>Dilemma</button>
            <button type="button" className={s.navLink} onClick={() => scrollToSection('platform')}>Platform</button>
            <button type="button" className={s.navLink} onClick={() => scrollToSection('workflow')}>How It Works</button>
            <button type="button" className={s.navLink} onClick={() => scrollToSection('integrity')}>Integrity</button>
            <Link
              to="/map"
              className={s.navLink}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 600, textDecoration: 'none' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
              Live City Map
            </Link>
            <button type="button" className={s.navBtnGhost} style={{ textAlign: 'center' }} onClick={() => { setMobileMenuOpen(false); setRoleModalMode('login'); setRoleModalOpen(true); }}>Login</button>
            <button type="button" className={s.navBtnPrimary} style={{ justifyContent: 'center' }} onClick={() => { setMobileMenuOpen(false); setRoleModalMode('signup'); setRoleModalOpen(true); }}>Sign Up</button>
          </div>
        )}

        {/* ============================================================
            2. HERO SECTION (Editorial Left + 3-Card Composite Right)
            ============================================================ */}
        <section id="hero" className={s.heroSection}>
          {/* Left Column: Bold Headline & Editorial Copy */}
          <div className={s.heroLeft}>
            <div className={s.pillBadge}>
              <span className={s.pillDot} />
              CIVIC INTELLIGENCE ENGINE
            </div>

            <h1 className={s.heroHeading}>
              Built for the next<br />
              generation of<br />
              civic action.
            </h1>

            <p className={s.heroParagraph}>
              CivicSetu is an intelligent civic triage platform purpose-built for citizens and municipal authorities to classify grievances, prioritize critical hazards, and accelerate urban resolution.
            </p>

            <div className={s.heroActions}>
              <Link to="/citizen/submit" className={s.primaryCtaBtn}>
                Report a Grievance
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link to="/track" className={s.secondaryCtaBtn}>
                Track a Complaint
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
                    alt="Ward 12 Municipal Infrastructure"
                    className={s.incidentImage}
                  />
                </div>
                <div className={s.incidentMeta}>
                  <h3 className={s.incidentTitle}>2026 Ward 12 Infrastructure</h3>
                  <span className={s.incidentSubtitle}>GEO-28.6139N / 77.2090E</span>
                  <Link to="/map" className={s.incidentLink}>
                    Explore Incident Map
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
                      <span className={s.metricMiniTag}>AI Triage</span>
                      <span className={s.metricMiniTag}>Ward Dispatch</span>
                    </div>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className={s.metricValue}>94%</div>
                  <p className={s.metricLabel}>Verified Grievance Resolution Rate</p>
                </div>
                <div className={s.metricFooter}>
                  <span>Target SLA: &lt; 24h</span>
                  <span>+18% MoM Efficiency</span>
                </div>
              </div>
            </div>

            {/* Bottom: Overview & Department Routing Card */}
            <div className={s.overviewCard}>
              <div className={s.overviewHeader}>
                <span className={s.overviewTitle}>AI Routing Overview</span>
                <span className={s.bestOptionBadge}>BEST ROUTE</span>
              </div>

              <div className={s.bestOptionBox}>
                <div className={s.bestOptionDept}>
                  <div className={s.bestOptionDot} />
                  <div>
                    <div className={s.bestOptionName}>Road & Infrastructure Dept</div>
                    <div className={s.bestOptionWard}>Ward 12 Central Division • PWD Cell</div>
                  </div>
                </div>
                <span className={s.bestOptionBadge}>98% MATCH</span>
              </div>

              <div className={s.scoreRow}>
                <div className={s.scoreItem}>
                  <span className={s.scoreValue}>98</span>
                  <span className={s.scoreDesc}>AI Confidence Score</span>
                </div>
                <div className={s.scoreItem}>
                  <span className={s.scoreValue}>&lt; 24h</span>
                  <span className={s.scoreDesc}>Policy SLA Target</span>
                </div>
                <div className={s.scoreItem}>
                  <span className={s.scoreValue}>Tier 1</span>
                  <span className={s.scoreDesc}>Emergency Dispatch</span>
                </div>
              </div>

              <div className={s.otherOptions}>
                <span className={s.otherOptionsLabel}>Other Department Evaluations</span>
                <div className={s.otherOptionItem}>
                  <span>Sanitation & Waste Cell</span>
                  <span className={s.otherOptionBadge}>Score: 42 • Secondary</span>
                </div>
                <div className={s.otherOptionItem}>
                  <span>Water Board Division</span>
                  <span className={s.otherOptionBadge}>Score: 28 • Non-Jurisdictional</span>
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
              CIVIC DILEMMA
            </div>
            <h2 className={s.sectionHeadline}>
              Why civic grievance resolution remains complex for most cities.
            </h2>
            <p className={s.sectionSubtext}>
              Traditional municipal reporting pipelines break down at intake, causing citizen disengagement and departmental delays.
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
              <h3 className={s.dilemmaCardTitle}>Unstructured Grievance Data</h3>
              <p className={s.dilemmaCardText}>
                Traditional helplines and paper registries lack standardized categorization, accurate geotags, and verified photographic evidence.
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
              <h3 className={s.dilemmaCardTitle}>Department Routing Friction</h3>
              <p className={s.dilemmaCardText}>
                Tickets are manually shuffled between road, drainage, and electricity desks without automated jurisdiction or ownership clarity.
              </p>
            </div>

            <div className={s.dilemmaCard}>
              <div className={s.dilemmaIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3 className={s.dilemmaCardTitle}>Zero Citizen Visibility</h3>
              <p className={s.dilemmaCardText}>
                Residents file reports into a black hole with no progress timestamps, live tracking codes, or enforceable resolution deadlines.
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
              ONE PLATFORM
            </div>
            <h2 className={s.sectionHeadline}>
              Full confidence in every civic action.
            </h2>
            <p className={s.sectionSubtext}>
              A single operational interface connecting proactive citizens, AI automated triage, and municipal workforces.
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
                      alt="CivicSetu Logo"
                      className={s.brandLogoImg}
                    />
                  </div>
                  <span className={s.sidebarBrandText}>CivicSetu</span>
                </div>

                <div className={s.sidebarNav}>
                  <div className={s.sidebarItem} onClick={() => navigate('/citizen/dashboard')} style={{ cursor: 'pointer' }} title="Citizen Dashboard">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                    Dashboard
                  </div>
                  <div className={`${s.sidebarItem} ${s.sidebarItemActive}`} onClick={() => navigate('/citizen/complaints')} style={{ cursor: 'pointer' }} title="View Grievance Queue">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                    Grievances
                    <span className={s.sidebarItemCount}>24</span>
                  </div>
                  <div className={s.sidebarItem} onClick={() => navigate('/map')} style={{ cursor: 'pointer' }} title="Open Live Incident Map">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
                    Live City Map
                  </div>
                  <div className={s.sidebarItem} onClick={() => navigate('/authority/dashboard')} style={{ cursor: 'pointer' }} title="Department Portal">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    Departments
                  </div>
                  <div className={s.sidebarItem} onClick={() => navigate('/superadmin/analytics')} style={{ cursor: 'pointer' }} title="System Analytics">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                    Analytics
                  </div>
                </div>
              </div>

              <div className={s.sidebarUser} onClick={() => navigate('/login/authority')} style={{ cursor: 'pointer' }} title="Authority Login">
                <div className={s.sidebarAvatar}>RM</div>
                <div className={s.sidebarUserInfo}>
                  <span className={s.sidebarUserName}>Rajesh M.</span>
                  <span className={s.sidebarUserRole}>Ward 12 Officer ↗</span>
                </div>
              </div>
            </div>

            {/* Registry Content Table */}
            <div className={s.registryContent}>
              <div className={s.registryTopBar}>
                <div className={s.registryHeadingGroup}>
                  <h3 className={s.registryTitle}>Grievance Registry</h3>
                  <span className={s.registrySub}>Automated AI intake, categorization, and routing queue</span>
                </div>

                <div className={s.registryControls}>
                  <div className={s.registrySearch}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                      type="text"
                      placeholder="Search grievances..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Link to="/citizen/submit" className={s.registryBtnAdd}>
                    + New Grievance
                  </Link>
                </div>
              </div>

              <table className={s.registryTable}>
                <thead>
                  <tr>
                    <th>Grievance Details</th>
                    <th>Reported</th>
                    <th>AI Match</th>
                    <th>Department</th>
                    <th>Priority</th>
                    <th>SLA Target</th>
                    <th>Routing</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={s.registryTableRow}
                      onMouseEnter={() => setActiveRow(index)}
                      style={{ background: activeRow === index ? '#F9FAF9' : 'transparent' }}
                    >
                      <td>
                        <div className={s.itemMain}>
                          <div className={s.itemIconThumb}>
                            {row.department.includes('Road') && '🛣️'}
                            {row.department.includes('Water') && '💧'}
                            {row.department.includes('Light') && '💡'}
                            {row.department.includes('Drain') && '🌊'}
                            {row.department.includes('Sanitation') && '🧹'}
                          </div>
                          <div>
                            <div className={s.itemTitleBold}>{row.title}</div>
                            <div className={s.itemSubLoc}>{row.location}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#5F6E62', fontSize: '12px' }}>{row.time}</td>
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
                          {row.priority}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
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
              <h4 className={s.featColTitle}>Built for Citizens</h4>
              <p className={s.featColDesc}>
                Frictionless mobile reporting with automatic GPS geotagging, instant photo proof, and zero paperwork.
              </p>
            </div>

            <div className={s.featCol}>
              <div className={s.featColIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
              </div>
              <h4 className={s.featColTitle}>Scalable and Modular</h4>
              <p className={s.featColDesc}>
                Connects all 5 municipal departments onto a unified real-time ledger across wards and zones.
              </p>
            </div>

            <div className={s.featCol}>
              <div className={s.featColIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
              <h4 className={s.featColTitle}>Automated AI Triage</h4>
              <p className={s.featColDesc}>
                Understands natural language complaints and classifies category, urgency, and routing in milliseconds.
              </p>
            </div>

            <div className={s.featCol}>
              <div className={s.featColIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <h4 className={s.featColTitle}>Real-Time Decisioning</h4>
              <p className={s.featColDesc}>
                Automated SLA timers and escalation alerts ensure public safety issues never sit idle.
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
                HOW CIVICSETU WORKS
              </div>
              <h2 className={s.workflowLeftHeading}>
                How CivicSetu<br />
                fits into your<br />
                civic workflow.
              </h2>
              <p className={s.workflowLeftDesc}>
                From the moment a resident spots a civic hazard to verified departmental fix, our platform orchestrates every stage seamlessly.
              </p>
              <Link to="/citizen/submit" className={s.primaryCtaBtn}>
                Report an Issue
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
                    <div style={{ height: '8px', background: '#DCE8DE', borderRadius: '4px', width: '80%' }} />
                    <div style={{ height: '8px', background: '#EAF0EB', borderRadius: '4px', width: '60%' }} />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', background: '#E2ECE4', padding: '3px 8px', borderRadius: '4px' }}>📍 Geotag Added</span>
                      <span style={{ fontSize: '11px', background: '#E2ECE4', padding: '3px 8px', borderRadius: '4px' }}>📷 Photo Proof</span>
                    </div>
                  </div>
                </div>
                <div className={s.stepNumber}>Step 1</div>
                <p className={s.stepCardText}>
                  Citizen submits grievance details with mobile photo, GPS location, and voice or text description.
                </p>
              </div>

              {/* Step 2 */}
              <div className={s.stepCard}>
                <div className={s.stepPreviewBox}>
                  <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #DCE6DC' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#1F6B34', marginBottom: '4px' }}>AI TRIAGE MATRIX</div>
                    <div style={{ fontSize: '12px', fontWeight: '600' }}>Roads & Infrastructure (98.4%)</div>
                    <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '2px' }}>High Urgency • SLA: &lt; 24h</div>
                  </div>
                </div>
                <div className={s.stepNumber}>Step 2</div>
                <p className={s.stepCardText}>
                  CivicSetu AI analyzes severity, confirms jurisdictional boundaries, and routes directly to the ward desk.
                </p>
              </div>

              {/* Step 3 */}
              <div className={s.stepCard}>
                <div className={s.stepPreviewBox}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600' }}>
                      <span>Ward 12 PWD</span>
                      <span style={{ color: '#16A34A' }}>✓ Dispatched</span>
                    </div>
                    <div style={{ height: '6px', background: '#22C55E', borderRadius: '3px', width: '100%' }} />
                    <span style={{ fontSize: '10.5px', color: '#5F6E62' }}>Citizen notified with tracking link</span>
                  </div>
                </div>
                <div className={s.stepNumber}>Step 3</div>
                <p className={s.stepCardText}>
                  Field teams execute repairs, upload resolution proof, and automatically close the ticket on the ledger.
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
              CIVIC-GRADE INTEGRITY
            </div>
            <h2 className={s.sectionHeadline}>
              Trust engineered into every resolution.
            </h2>
            <p className={s.sectionSubtext}>
              Built on verified accountability standards that guarantee transparent governance for both citizens and municipal officers.
            </p>
          </div>

          <div className={s.trustGrid}>
            <div className={s.trustCard}>
              <div className={s.trustCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <h4 className={s.trustCardTitle}>Geotagged Photo Proof</h4>
              <p className={s.trustCardDesc}>
                Tamper-resistant EXIF coordinates and timestamp verification ensure every filed complaint corresponds to a physical real-world site.
              </p>
            </div>

            <div className={s.trustCard}>
              <div className={s.trustCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 12l-4-4-4 4M12 16V9" /></svg>
              </div>
              <h4 className={s.trustCardTitle}>Zero-Drop Routing Engine</h4>
              <p className={s.trustCardDesc}>
                Complaints are bound programmatically to designated ward officers, eliminating bureaucratic ping-pong and jurisdictional loopholes.
              </p>
            </div>

            <div className={s.trustCard}>
              <div className={s.trustCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>
              </div>
              <h4 className={s.trustCardTitle}>SLA Compliance Audit</h4>
              <p className={s.trustCardDesc}>
                Citizen charters are enforced through automatic escalation notifications sent to municipal supervisors when deadlines approach.
              </p>
            </div>

            <div className={s.trustCard}>
              <div className={s.trustCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              </div>
              <h4 className={s.trustCardTitle}>Public Live Tracking</h4>
              <p className={s.trustCardDesc}>
                Every resident receives a unique alphanumeric tracking code to inspect real-time departmental notes and repair photographs.
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
                GET STARTED
              </div>
              <h2 className={s.ctaHeading}>
                Ready to modernize your city's civic response?
              </h2>
            </div>

            <div className={s.ctaRight}>
              <p className={s.ctaSubtext}>
                Report a civic problem in under 60 seconds or track an ongoing complaint with your unique code.
              </p>

              <div
                className={s.ctaTabletCard}
                onClick={() => navigate('/citizen/submit')}
                style={{ cursor: 'pointer' }}
                title="Open Citizen Grievance Portal"
              >
                <div className={s.ctaTabletLogoWrap}>
                  <img
                    src="/civicsetu-logo.png"
                    onError={(e) => { e.currentTarget.src = '/static/civicsetu-logo.png'; }}
                    alt="CivicSetu App"
                    className={s.brandLogoImg}
                  />
                </div>
                <div className={s.ctaTabletInfo}>
                  <span className={s.ctaTabletTitle}>CivicSetu Citizen Portal</span>
                  <span className={s.ctaTabletDesc}>Instant mobile-friendly reporting without downloading any app ↗</span>
                </div>
              </div>

              <div className={s.ctaButtonRow}>
                <Link to="/citizen/submit" className={s.ctaBtnBlack}>
                  Report an Issue
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/track" className={s.ctaBtnWhite}>
                  Track a Complaint
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
                  alt="CivicSetu Logo"
                  className={s.brandLogoImg}
                />
              </div>
              <span className={s.footerCopyright}>© 2026 CivicSetu. Built for sustainable Indian communities.</span>
            </div>

            <div className={s.footerLinks}>
              <button type="button" className={s.footerLink} onClick={() => scrollToSection('hero')}>Product</button>
              <button type="button" className={s.footerLink} onClick={() => scrollToSection('workflow')}>How It Works</button>
              <Link to="/citizen/submit" className={s.footerLink}>Report Grievance</Link>
              <Link to="/track" className={s.footerLink}>Track Complaint</Link>
              <Link to="/map" className={s.footerLink}>Live City Map</Link>
              <Link to="/login/authority" className={s.footerLink}>Municipal Login</Link>
              <button
                type="button"
                className={s.footerLink}
                onClick={() => { setRoleModalMode('login'); setRoleModalOpen(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
              >
                Role Portals ↗
              </button>
            </div>
          </div>

          <div
            className={s.giantWordmarkRow}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ cursor: 'pointer' }}
            title="Scroll to top"
          >
            <div className={s.giantLogoBridge}>
              <img
                src="/civicsetu-logo.png"
                onError={(e) => { e.currentTarget.src = '/static/civicsetu-logo.png'; }}
                alt="CivicSetu Official Logo"
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
