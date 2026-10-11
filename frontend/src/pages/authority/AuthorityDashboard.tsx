import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import authorityService from '../../services/authority.service';
import { DashboardSummary } from '../../types/authority';
import { Complaint } from '../../types/complaint';
import Icon from '../../components/ui/Icon';
import Badge from '../../components/ui/Badge';
import { formatDate, formatTimeAgo, truncateText } from '../../utils/formatters';
import s from './AuthorityDashboard.module.css';

export const AuthorityDashboard: React.FC = () => {
  const { user } = useAuthStore();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [sumData, recData] = await Promise.all([
        authorityService.getDashboardSummary(),
        authorityService.getRecentComplaints(),
      ]);
      setSummary(sumData);
      setRecentComplaints(recData);
    } catch {
      // Fallback if data empty
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(false);
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 3500);

    const onFocus = () => loadDashboard(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'success';
      case 'IN_PROGRESS':
      case 'ASSIGNED':
        return 'authority';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
      case 'CLOSED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className={s.container}>
      {/* Officer Header */}
      <div className={s.headerCard}>
        <div className={s.officerMeta}>
          <div className={s.officerAvatar}>
            <Icon name="shield_person" size={28} />
          </div>
          <div>
            <div className={s.deptPill}>
              <Icon name="verified" size={14} style={{ color: '#34d399' }} />
              <span>{user?.department || 'Municipal Engineering & Works'}</span>
            </div>
            <h1 className={s.officerName}>{user?.full_name || 'Nodal Authority Officer'}</h1>
            <p className={s.officerTitle}>
              {user?.designation || 'Executive Nodal Officer'} ● Jurisdictional Dispatch Console
            </p>
          </div>
        </div>

        <div className={s.headerActions}>
          <Link to="/authority/complaints" className={s.btnPrimary}>
            <Icon name="assignment" size={18} />
            <span>Manage Assigned Queue</span>
          </Link>
          <Link to="/authority/analytics" className={s.btnSecondary}>
            <Icon name="analytics" size={18} />
            <span>SLA Performance</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Counters */}
      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <div className={s.statIconWrapper} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Icon name="inbox" size={24} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Total in Scope</span>
            <span className={s.statNum}>{isLoading ? '...' : summary?.total_complaints ?? 0}</span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIconWrapper} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Icon name="pending_actions" size={24} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Pending Triage</span>
            <span className={s.statNum}>{isLoading ? '...' : summary?.pending ?? 0}</span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIconWrapper} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Icon name="construction" size={24} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Work in Progress</span>
            <span className={s.statNum}>{isLoading ? '...' : summary?.in_progress ?? 0}</span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIconWrapper} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <Icon name="warning" size={24} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Urgent / Critical</span>
            <span className={s.statNum} style={{ color: '#f87171' }}>
              {isLoading ? '...' : summary?.urgent_active ?? 0}
            </span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Icon name="task_alt" size={24} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Resolved & Closed</span>
            <span className={s.statNum} style={{ color: '#34d399' }}>
              {isLoading ? '...' : summary?.resolved ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Urgent Grievances & Recent Dispatches */}
      <div className={s.mainGrid}>
        {/* Left: Recent Complaints Queue */}
        <div className={s.queueCard}>
          <div className={s.cardHeader}>
            <div>
              <h2 className={s.cardTitle}>Live Incident Dispatch Stream</h2>
              <p className={s.cardSub}>Latest incoming grievances routed to your jurisdiction</p>
            </div>

            <Link to="/authority/complaints" className={s.viewQueueLink}>
              <span>Full Work Queue</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>

          {isLoading ? (
            <div className={s.loadingBox}>
              <span className={s.spinner}></span>
              <span>Loading incident stream...</span>
            </div>
          ) : recentComplaints.length === 0 ? (
            <div className={s.emptyBox}>
              <Icon name="assignment_turned_in" size={40} style={{ color: '#64748b' }} />
              <h3>Work Queue Clean</h3>
              <p>No new grievances currently awaiting review in your department queue.</p>
            </div>
          ) : (
            <div className={s.complaintList}>
              {recentComplaints.map((c) => (
                <div key={c.public_id || c.tracking_code} className={s.complaintItem}>
                  <div className={s.itemMain}>
                    <div className={s.itemMeta}>
                      <span className={s.trackingCode}>{c.tracking_code}</span>
                      <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                      <span
                        className={s.priorityPill}
                        style={{
                          color:
                            c.priority === 'URGENT' || c.priority === 'HIGH'
                              ? '#f87171'
                              : '#38bdf8',
                        }}
                      >
                        ● {c.priority}
                      </span>
                    </div>

                    <h4 className={s.itemTitle}>{c.title}</h4>
                    <p className={s.itemDesc}>{truncateText(c.description, 120)}</p>

                    <div className={s.itemFooter}>
                      <span className={s.footerTag}>
                        <Icon name="location_on" size={14} />
                        {truncateText(c.location_address, 40)}
                      </span>
                      <span className={s.footerTag}>
                        <Icon name="person" size={14} />
                        {c.citizen_name || 'Citizen'}
                      </span>
                      <span className={s.footerTag}>
                        <Icon name="schedule" size={14} />
                        {formatTimeAgo(c.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className={s.itemActions}>
                    <Link
                      to={`/authority/complaints?search=${c.tracking_code}`}
                      className={s.actionBtn}
                    >
                      <span>Action</span>
                      <Icon name="chevron_right" size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Operational Status & SLA Guidelines */}
        <div className={s.sideCol}>
          {/* SLA Performance Card */}
          <div className={s.slaCard}>
            <div className={s.slaHeader}>
              <Icon name="timer" size={22} style={{ color: '#34d399' }} />
              <h4>Municipal SLA Benchmark</h4>
            </div>
            <div className={s.slaMetric}>
              <span className={s.slaVal}>
                {summary && summary.total_complaints > 0
                  ? `${(((summary.resolved || 0) / summary.total_complaints) * 100).toFixed(1)}%`
                  : (summary ? '100.0%' : '—')}
              </span>
              <span className={s.slaLabel}>On-Time Resolution Compliance</span>
            </div>
            <div className={s.slaProgress}>
              <div
                className={s.slaBar}
                style={{
                  width: `${
                    summary && summary.total_complaints > 0
                      ? Math.min(100, Math.round(((summary.resolved || 0) / summary.total_complaints) * 100))
                      : (summary ? 100 : 0)
                  }%`,
                }}
              ></div>
            </div>
            <p className={s.slaNote}>
              Standard TAT benchmark for department is <strong>24 to 48 hours</strong>. Urgent safety incidents require crew dispatch within <strong>2 hours</strong>.
            </p>
          </div>

          {/* Quick Actions Card */}
          <div className={s.quickCard}>
            <h4 className={s.quickTitle}>Authority Dispatch Hub</h4>
            <div className={s.quickLinks}>
              <Link to="/authority/complaints" className={s.quickLinkItem}>
                <Icon name="assignment_late" size={18} style={{ color: '#f87171' }} />
                <span>Filter Urgent Incidents</span>
              </Link>
              <Link to="/authority/analytics" className={s.quickLinkItem}>
                <Icon name="bar_chart" size={18} style={{ color: '#818cf8' }} />
                <span>View Resolution TAT Trends</span>
              </Link>
              <Link to="/authority/notifications" className={s.quickLinkItem}>
                <Icon name="notifications_active" size={18} style={{ color: '#fbbf24' }} />
                <span>Nodal Broadcast Notifications</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityDashboard;
