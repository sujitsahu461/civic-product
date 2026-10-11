import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import Icon from '../../components/ui/Icon';
import { showToast } from '../../components/ui/Toast';
import { formatTimeAgo, truncateText } from '../../utils/formatters';
import s from './CitizenDashboard.module.css';

export const CitizenDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { complaints, isLoading, fetchComplaints } = useComplaintStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchComplaints();
    const interval = setInterval(() => {
      fetchComplaints(undefined, true);
    }, 4000);
    const onFocus = () => fetchComplaints(undefined, true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const recentComplaints = complaints.slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className={s.statusBadge + ' ' + s.statusResolved}>
            <Icon name="check_circle" size={14} />
            {t('statuses.RESOLVED')}
          </span>
        );
      case 'IN_PROGRESS':
      case 'ASSIGNED':
        return (
          <span className={s.statusBadge + ' ' + s.statusProgress}>
            <Icon name="settings" size={14} />
            {t('statuses.IN_PROGRESS')}
          </span>
        );
      case 'PENDING':
        return (
          <span className={s.statusBadge + ' ' + s.statusPending}>
            <Icon name="schedule" size={14} />
            {t('statuses.PENDING')}
          </span>
        );
      case 'REJECTED':
      case 'CLOSED':
        return (
          <span className={s.statusBadge + ' ' + s.statusRejected}>
            <Icon name="cancel" size={14} />
            {t('statuses.REJECTED')}
          </span>
        );
      default:
        return (
          <span className={s.statusBadge + ' ' + s.statusPending}>
            <Icon name="schedule" size={14} />
            {status}
          </span>
        );
    }
  };

  const citizenName = user?.full_name ? user.full_name.split(' ')[0] : 'Citizen';
  const citizenId = user?.public_id?.slice(0, 8).toUpperCase() || 'CS-CITIZEN';

  const handleCopyId = (e: React.MouseEvent) => {
    e.preventDefault();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(citizenId);
      showToast(`Citizen ID ${citizenId} copied to clipboard!`, 'success');
    }
  };

  return (
    <div className={s.container}>
      {/* ================= HERO WELCOME BANNER ================= */}
      <section className={s.heroBanner}>
        <div className={s.heroBgWrapper}>
          <img
            src="/green-eco-city.jpg"
            alt="Cleaner Cities Greener Tomorrow"
            className={s.heroBgImg}
          />
          <div className={s.heroBgOverlay} />
        </div>

        <div className={s.heroLeft}>
          <div className={s.heroTag}>
            <span className={s.leafIcon}>🌿</span>
            <span>{t('common.tagline')}</span>
          </div>

          <h1 className={s.heroTitle}>{t('dashboard.welcome')}, {citizenName} 👋</h1>

          <p className={s.heroSubtitle}>
            {t('dashboard.welcomeSubtitle')}
          </p>

          <div className={s.heroActions}>
            <Link to="/citizen/complaints/new" className={s.btnPrimary}>
              <Icon name="add_circle" size={18} />
              <span>{t('nav.reportIssue')}</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
            <Link to="/citizen/tracking" className={s.btnSecondary}>
              <Icon name="search" size={18} />
              <span>{t('nav.trackComplaint')}</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        </div>

        {/* Right Info Card */}
        <div className={s.heroInfoCard}>
          <div className={s.infoRow}>
            <div className={s.infoIconGreen}>
              <Icon name="location_on" size={20} />
            </div>
            <div className={s.infoContent}>
              <span className={s.infoLabel}>{t('common.location')}</span>
              <span className={s.infoValue}>{user?.address || 'Central District'}</span>
            </div>
            <Link to="/citizen/profile" className={s.editBtn}>
              {t('common.actions')}
            </Link>
          </div>

          <div className={s.infoDivider} />

          <div className={s.infoRow}>
            <div className={s.infoIconBlue}>
              <Icon name="badge" size={20} />
            </div>
            <div className={s.infoContent}>
              <span className={s.infoLabel}>Citizen ID</span>
              <span className={s.infoValue}>{citizenId}</span>
            </div>
            <button className={s.copyBtn} title="Copy ID" onClick={handleCopyId} type="button">
              <Icon name="content_copy" size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT: 2 COLUMNS ================= */}
      <section className={s.mainGrid}>
        {/* LEFT: Recent Grievances */}
        <div className={s.recentSection}>
          <div className={s.sectionHeader}>
            <div className={s.sectionTitleGroup}>
              <div className={s.sectionIcon}>
                <Icon name="assignment" size={22} />
              </div>
              <div>
                <h2 className={s.sectionTitle}>{t('dashboard.recentTitle')}</h2>
                <p className={s.sectionSub}>{t('history.subtitle')}</p>
              </div>
            </div>
            <Link to="/citizen/complaints" className={s.viewAllBtn}>
              {t('dashboard.viewAll')} <Icon name="arrow_forward" size={16} />
            </Link>
          </div>

          {isLoading && complaints.length === 0 ? (
            <div className={s.loadingState}>
              <span className={s.spinner}></span>
              <span>{t('common.loading')}</span>
            </div>
          ) : recentComplaints.length === 0 ? (
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>
                <Icon name="assignment_turned_in" size={32} />
              </div>
              <h4 className={s.emptyTitle}>{t('history.emptyTitle')}</h4>
              <p className={s.emptySub}>{t('history.emptyDesc')}</p>
              <Link to="/citizen/complaints/new" className={s.btnPrimary}>
                <Icon name="add" size={16} />
                <span>{t('history.fileFirstBtn')}</span>
              </Link>
            </div>
          ) : (
            <div className={s.grievanceList}>
              {recentComplaints.map((item) => (
                <Link
                  key={item.public_id}
                  to={`/citizen/tracking?code=${item.tracking_code}`}
                  className={s.grievanceCard}
                >
                  {/* Thumbnail */}
                  <div className={s.cardThumb}>
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={typeof item.images[0] === 'string' ? item.images[0] : (item.images[0] as any)?.image}
                        alt=""
                        className={s.thumbImg}
                      />
                    ) : (
                      <div className={s.thumbPlaceholder}>
                        <Icon name="image" size={24} />
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className={s.cardBody}>
                    <div className={s.cardTopRow}>
                      <span className={s.trackingCode}>{item.tracking_code}</span>
                      <span className={s.deptBadge}>
                        {t(`categories.${item.category}`) || item.department_name || item.category || 'Civic'}
                      </span>
                    </div>
                    <h3 className={s.cardTitle}>{item.title}</h3>
                    <div className={s.cardMeta}>
                      <span className={s.metaItem}>
                        <Icon name="location_on" size={13} />
                        {truncateText(item.location_address || 'Central Ward', 28)}
                      </span>
                      <span className={s.metaItem}>
                        <Icon name="schedule" size={13} />
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status + Chevron */}
                  <div className={s.cardRight}>
                    {getStatusBadge(item.status)}
                    <div className={s.chevronCircle}>
                      <Icon name="chevron_right" size={18} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Quick Actions & SLA Commitments */}
        <div className={s.rightColumn}>
          {/* Quick Actions Card */}
          <div className={s.quickActionsPanel}>
            <div className={s.quickActionsHeader}>
              <h2 className={s.quickActionsTitle}>{t('dashboard.quickActions')}</h2>
              <p className={s.quickActionsSub}>{t('dashboard.welcomeSubtitle')}</p>
            </div>

            <div className={s.actionsList}>
              <Link to="/citizen/complaints/new" className={s.actionItem}>
                <div className={s.actionIconGreen}>
                  <Icon name="edit_note" size={24} />
                </div>
                <div className={s.actionContent}>
                  <h3 className={s.actionName}>{t('dashboard.fileNew')}</h3>
                  <p className={s.actionDesc}>{t('submit.pageSubtitle')}</p>
                </div>
                <div className={s.actionArrow}>
                  <Icon name="chevron_right" size={20} />
                </div>
              </Link>

              <Link to="/citizen/tracking" className={s.actionItem}>
                <div className={s.actionIconBlue}>
                  <Icon name="search" size={24} />
                </div>
                <div className={s.actionContent}>
                  <h3 className={s.actionName}>{t('dashboard.trackExisting')}</h3>
                  <p className={s.actionDesc}>{t('track.subtitle')}</p>
                </div>
                <div className={s.actionArrow}>
                  <Icon name="chevron_right" size={20} />
                </div>
              </Link>

              <Link to="/citizen/complaints" className={s.actionItem}>
                <div className={s.actionIconTeal}>
                  <Icon name="assignment" size={24} />
                </div>
                <div className={s.actionContent}>
                  <h3 className={s.actionName}>{t('dashboard.viewAll')}</h3>
                  <p className={s.actionDesc}>{t('history.subtitle')}</p>
                </div>
                <div className={s.actionArrow}>
                  <Icon name="chevron_right" size={20} />
                </div>
              </Link>
            </div>
          </div>

          {/* Civic Redressal SLA Commitments */}
          <div className={s.slaCard}>
            <div className={s.slaHeader}>
              <Icon name="verified_user" size={18} className={s.slaIcon} />
              <h3 className={s.slaTitle}>Civic Redressal SLA Commitments</h3>
            </div>
            <p className={s.slaDesc}>
              CivicSetu enforces deterministic service-level agreements across municipal nodal departments:
            </p>
            <div className={s.slaList}>
              <div className={s.slaItem}>
                <div className={s.slaItemLeft}>
                  <span className={s.slaIconSmall}>🌱</span>
                  <span>{t('categories.ROAD')}</span>
                </div>
                <span className={s.slaBadge}>~24 Hours</span>
              </div>
              <div className={s.slaItem}>
                <div className={s.slaItemLeft}>
                  <span className={s.slaIconSmall}>💧</span>
                  <span>{t('categories.WATER')}</span>
                </div>
                <span className={s.slaBadge}>~12 Hours</span>
              </div>
              <div className={s.slaItem}>
                <div className={s.slaItemLeft}>
                  <span className={s.slaIconSmall}>⚡</span>
                  <span>{t('categories.ELECTRICITY')}</span>
                </div>
                <span className={s.slaBadge}>~6 Hours</span>
              </div>
              <div className={s.slaItem}>
                <div className={s.slaItemLeft}>
                  <span className={s.slaIconSmall}>🗑️</span>
                  <span>{t('categories.SANITATION')}</span>
                </div>
                <span className={s.slaBadge}>~12 Hours</span>
              </div>
              <div className={s.slaItem}>
                <div className={s.slaItemLeft}>
                  <span className={s.slaIconSmall}>🌊</span>
                  <span>{t('categories.DRAINAGE')}</span>
                </div>
                <span className={s.slaBadge}>~18 Hours</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CitizenDashboard;
