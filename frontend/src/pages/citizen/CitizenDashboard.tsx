import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import Icon from '../../components/ui/Icon';
import { showToast } from '../../components/ui/Toast';
import { formatTimeAgo, truncateText } from '../../utils/formatters';
import s from './CitizenDashboard.module.css';

export const CitizenDashboard: React.FC = () => {
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
            RESOLVED
          </span>
        );
      case 'IN_PROGRESS':
      case 'ASSIGNED':
        return (
          <span className={s.statusBadge + ' ' + s.statusProgress}>
            <Icon name="settings" size={14} />
            IN PROGRESS
          </span>
        );
      case 'PENDING':
        return (
          <span className={s.statusBadge + ' ' + s.statusPending}>
            <Icon name="schedule" size={14} />
            PENDING
          </span>
        );
      case 'REJECTED':
      case 'CLOSED':
        return (
          <span className={s.statusBadge + ' ' + s.statusRejected}>
            <Icon name="cancel" size={14} />
            REJECTED
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
      {/* ================= HERO WELCOME BANNER (GREENERY & ECO-FRIENDLY MERGED) ================= */}
      <section className={s.heroBanner}>
        {/* Full-width merged background eco illustration */}
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
            <span>CLEANER CITIES · GREENER TOMORROW</span>
          </div>

          <h1 className={s.heroTitle}>Hello, {citizenName} 👋</h1>

          <p className={s.heroSubtitle}>
            Report environmental and civic issues,
            track your complaints and help build a cleaner,
            healthier community.
          </p>

          <div className={s.heroActions}>
            <Link to="/citizen/submit" className={s.btnPrimary}>
              <Icon name="add_circle" size={18} />
              <span>Report a Grievance</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
            <Link to="/citizen/tracking" className={s.btnSecondary}>
              <Icon name="search" size={18} />
              <span>Track Complaint</span>
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
              <span className={s.infoLabel}>My Location</span>
              <span className={s.infoValue}>{user?.address || 'Central District'}</span>
            </div>
            <Link to="/citizen/profile" className={s.editBtn}>
              Edit
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
                <h2 className={s.sectionTitle}>Recent Grievances</h2>
                <p className={s.sectionSub}>Your latest submitted complaints</p>
              </div>
            </div>
            <Link to="/citizen/complaints" className={s.viewAllBtn}>
              View All <Icon name="arrow_forward" size={16} />
            </Link>
          </div>

          {isLoading && complaints.length === 0 ? (
            <div className={s.loadingState}>
              <span className={s.spinner}></span>
              <span>Loading grievances...</span>
            </div>
          ) : recentComplaints.length === 0 ? (
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>
                <Icon name="assignment_turned_in" size={32} />
              </div>
              <h4 className={s.emptyTitle}>No grievances yet</h4>
              <p className={s.emptySub}>You haven't submitted any civic complaints.</p>
              <Link to="/citizen/submit" className={s.btnPrimary}>
                <Icon name="add" size={16} />
                <span>Report a Grievance</span>
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
                        {item.department_name || item.category || 'Civic'}
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
              <h2 className={s.quickActionsTitle}>Quick Actions</h2>
              <p className={s.quickActionsSub}>Choose what you want to do</p>
            </div>

            <div className={s.actionsList}>
              {/* Action 1: Report a Grievance */}
              <Link to="/citizen/submit" className={s.actionItem}>
                <div className={s.actionIconGreen}>
                  <Icon name="edit_note" size={24} />
                </div>
                <div className={s.actionContent}>
                  <h3 className={s.actionName}>Report a Grievance</h3>
                  <p className={s.actionDesc}>Submit an environmental or civic issue with details, location and photo.</p>
                </div>
                <div className={s.actionArrow}>
                  <Icon name="chevron_right" size={20} />
                </div>
              </Link>

              {/* Action 2: Track Complaint */}
              <Link to="/citizen/tracking" className={s.actionItem}>
                <div className={s.actionIconBlue}>
                  <Icon name="search" size={24} />
                </div>
                <div className={s.actionContent}>
                  <h3 className={s.actionName}>Track Complaint</h3>
                  <p className={s.actionDesc}>Check the current status of your submitted complaint.</p>
                </div>
                <div className={s.actionArrow}>
                  <Icon name="chevron_right" size={20} />
                </div>
              </Link>

              {/* Action 3: My Grievances */}
              <Link to="/citizen/complaints" className={s.actionItem}>
                <div className={s.actionIconTeal}>
                  <Icon name="assignment" size={24} />
                </div>
                <div className={s.actionContent}>
                  <h3 className={s.actionName}>My Grievances</h3>
                  <p className={s.actionDesc}>View your complaints and latest updates.</p>
                </div>
                <div className={s.actionArrow}>
                  <Icon name="chevron_right" size={20} />
                </div>
              </Link>
            </div>
          </div>

          {/* Civic Redressal SLA Commitments (From Screenshot 2) */}
          <div className={s.slaCard}>
            <div className={s.slaHeader}>
              <Icon name="verified_user" size={18} className={s.slaIcon} />
              <h3 className={s.slaTitle}>Civic Redressal SLA Commitments</h3>
            </div>
            <p className={s.slaDesc}>
              CivicSetu enforces automated service-level agreements across municipal nodal departments:
            </p>
            <div className={s.slaList}>
              <div className={s.slaItem}>
                <div className={s.slaItemLeft}>
                  <span className={s.slaIconSmall}>🌱</span>
                  <span>Roads & Pavements</span>
                </div>
                <span className={s.slaBadge}>~24 Hours</span>
              </div>
              <div className={s.slaItem}>
                <div className={s.slaItemLeft}>
                  <span className={s.slaIconSmall}>💧</span>
                  <span>Water Supply Leaks</span>
                </div>
                <span className={s.slaBadge}>~12 Hours</span>
              </div>
              <div className={s.slaItem}>
                <div className={s.slaItemLeft}>
                  <span className={s.slaIconSmall}>⚡</span>
                  <span>Streetlights & Electricity</span>
                </div>
                <span className={s.slaBadge}>~6 Hours</span>
              </div>
              <div className={s.slaItem}>
                <div className={s.slaItemLeft}>
                  <span className={s.slaIconSmall}>🗑️</span>
                  <span>Sanitation & Waste</span>
                </div>
                <span className={s.slaBadge}>~12 Hours</span>
              </div>
              <div className={s.slaItem}>
                <div className={s.slaItemLeft}>
                  <span className={s.slaIconSmall}>🌊</span>
                  <span>Drainage & Sewerage</span>
                </div>
                <span className={s.slaBadge}>~18 Hours</span>
              </div>
            </div>
          </div>

          {/* Community Banner (From Screenshot 3) */}
          <div className={s.communityBanner}>
            <div className={s.communityContent}>
              <h3 className={s.communityTitle}>Together for a Cleaner and Greener Community</h3>
              <p className={s.communityDesc}>Report Issues. Create change. Keep our environment healthy.</p>
            </div>
            <div className={s.communityLeaf}>
              <img src="/leaf-plant.jpg" alt="Green seedling" />
              <span>🌱</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CitizenDashboard;
