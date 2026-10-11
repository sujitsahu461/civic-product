import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import authorityService from '../../services/authority.service';
import { AuthorityNotification } from '../../types/authority';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { formatTimeAgo } from '../../utils/formatters';
import s from './AuthorityNotifications.module.css';

interface NotificationTheme {
  icon: string;
  typeLabel: string;
  themeClass: string;
  iconBgClass: string;
}

const getNotificationTheme = (type: string): NotificationTheme => {
  switch (type) {
    case 'NEW_COMPLAINT':
      return {
        icon: 'campaign',
        typeLabel: 'New Grievance',
        themeClass: s.typeNew,
        iconBgClass: s.typeNew,
      };
    case 'COMPLAINT_ASSIGNED':
      return {
        icon: 'assignment_ind',
        typeLabel: 'Incident Assigned',
        themeClass: s.typeAssigned,
        iconBgClass: s.typeAssigned,
      };
    case 'STATUS_CHANGED':
      return {
        icon: 'published_with_changes',
        typeLabel: 'Status Update',
        themeClass: s.typeStatus,
        iconBgClass: s.typeStatus,
      };
    case 'RESOLUTION_UPDATE':
      return {
        icon: 'task_alt',
        typeLabel: 'Resolution Logged',
        themeClass: s.typeResolved,
        iconBgClass: s.typeResolved,
      };
    case 'PRIORITY_CHANGED':
      return {
        icon: 'priority_high',
        typeLabel: 'Priority Escalation',
        themeClass: s.typePriority,
        iconBgClass: s.typePriority,
      };
    default:
      return {
        icon: 'notifications',
        typeLabel: 'Dispatch Alert',
        themeClass: s.typeSystem,
        iconBgClass: s.typeSystem,
      };
  }
};

export const AuthorityNotifications: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [notifications, setNotifications] = useState<AuthorityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const loadNotifications = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [notifs, unreadRes] = await Promise.all([
        authorityService.getNotifications(),
        authorityService.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(unreadRes.unread_count);
    } catch {
      // Fallback
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(false);
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 4000);

    const onFocus = () => loadNotifications(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const handleMarkRead = async (notif: AuthorityNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const notifId = notif.public_id || String(notif.id);
    if (notif.is_read || !notifId) return;

    try {
      await authorityService.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => ((n.public_id || String(n.id)) === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await authorityService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      success('All authority dispatch alerts marked as read.');
    } catch {
      toastError('Could not mark all notifications as read.');
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.is_read).length;
    const newGrievances = notifications.filter((n) => n.notification_type === 'NEW_COMPLAINT').length;
    const assignments = notifications.filter((n) => n.notification_type === 'COMPLAINT_ASSIGNED').length;
    return { total, unread, newGrievances, assignments };
  }, [notifications]);

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // 1. Tab filter
      if (activeFilter === 'UNREAD' && notif.is_read) return false;
      if (activeFilter === 'NEW_COMPLAINT' && notif.notification_type !== 'NEW_COMPLAINT') return false;
      if (activeFilter === 'ASSIGNED' && notif.notification_type !== 'COMPLAINT_ASSIGNED') return false;
      if (activeFilter === 'STATUS' && notif.notification_type !== 'STATUS_CHANGED') return false;
      if (activeFilter === 'PRIORITY' && notif.notification_type !== 'PRIORITY_CHANGED') return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = notif.title.toLowerCase().includes(q);
        const matchesMsg = notif.message.toLowerCase().includes(q);
        const matchesCode = (notif.complaint_tracking_code || '').toLowerCase().includes(q);
        return matchesTitle || matchesMsg || matchesCode;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  return (
    <div className={s.container}>
      {/* Top Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <div className={s.titleRow}>
            <h1 className={s.title}>Authority Dispatch Alerts</h1>
            <div className={s.liveTag}>
              <span className={s.pulseDot}></span>
              <span>Live Radar Feed</span>
            </div>
          </div>
          <p className={s.subtitle}>
            Real-time notifications on new incident assignments, citizen updates, and SLA escalations.
          </p>
        </div>

        <div className={s.headerActions}>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              leftIcon={<Icon name="done_all" size={16} />}
            >
              Mark All Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={`${s.statIconWrapper} ${s.typeSystem}`}>
            <Icon name="notifications" size={20} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statCount}>{stats.total}</span>
            <span className={s.statLabel}>Total Alerts</span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={`${s.statIconWrapper} ${stats.unread > 0 ? s.typePriority : s.typeSystem}`}>
            <Icon name="mark_email_unread" size={20} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statCount}>{stats.unread}</span>
            <span className={s.statLabel}>Unread Pending</span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={`${s.statIconWrapper} ${s.typeNew}`}>
            <Icon name="campaign" size={20} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statCount}>{stats.newGrievances}</span>
            <span className={s.statLabel}>New Grievances</span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={`${s.statIconWrapper} ${s.typeAssigned}`}>
            <Icon name="assignment_ind" size={20} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statCount}>{stats.assignments}</span>
            <span className={s.statLabel}>Assignments</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className={s.toolbar}>
        <div className={s.searchWrapper}>
          <Icon name="search" size={18} className={s.searchIcon} />
          <input
            type="text"
            className={s.searchInput}
            placeholder="Search alerts by incident code (CMP-...), title, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={s.searchClearBtn}
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <div className={s.filterChipsRow}>
          <button
            type="button"
            className={`${s.filterChip} ${activeFilter === 'ALL' ? s.filterChipActive : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            <span>All Alerts</span>
            <span className={s.chipCount}>{stats.total}</span>
          </button>

          <button
            type="button"
            className={`${s.filterChip} ${activeFilter === 'UNREAD' ? s.filterChipActive : ''}`}
            onClick={() => setActiveFilter('UNREAD')}
          >
            <span>Unread</span>
            {stats.unread > 0 && <span className={s.chipCount}>{stats.unread}</span>}
          </button>

          <button
            type="button"
            className={`${s.filterChip} ${activeFilter === 'NEW_COMPLAINT' ? s.filterChipActive : ''}`}
            onClick={() => setActiveFilter('NEW_COMPLAINT')}
          >
            <span>New Grievances</span>
            <span className={s.chipCount}>{stats.newGrievances}</span>
          </button>

          <button
            type="button"
            className={`${s.filterChip} ${activeFilter === 'ASSIGNED' ? s.filterChipActive : ''}`}
            onClick={() => setActiveFilter('ASSIGNED')}
          >
            <span>Assignments</span>
            <span className={s.chipCount}>{stats.assignments}</span>
          </button>

          <button
            type="button"
            className={`${s.filterChip} ${activeFilter === 'STATUS' ? s.filterChipActive : ''}`}
            onClick={() => setActiveFilter('STATUS')}
          >
            <span>Status Updates</span>
          </button>

          <button
            type="button"
            className={`${s.filterChip} ${activeFilter === 'PRIORITY' ? s.filterChipActive : ''}`}
            onClick={() => setActiveFilter('PRIORITY')}
          >
            <span>Escalations</span>
          </button>
        </div>
      </div>

      {/* Main Alert List */}
      {isLoading ? (
        <div className={s.loadingBox}>
          <span className={s.spinner}></span>
          <span>Syncing authority notification queue...</span>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className={s.emptyBox}>
          <div className={s.emptyIconWrapper}>
            <Icon name="notifications_off" size={32} />
          </div>
          <h3 className={s.emptyTitle}>All Clear in Dispatch Feed</h3>
          <p className={s.emptyDesc}>
            {searchQuery
              ? `No alerts matched "${searchQuery}". Try clearing the search query.`
              : activeFilter !== 'ALL'
              ? 'No notifications found in this category filter.'
              : 'No active incident dispatch alerts or escalation notifications at this moment.'}
          </p>
        </div>
      ) : (
        <div className={s.list}>
          {filteredNotifications.map((notif) => {
            const theme = getNotificationTheme(notif.notification_type);
            const trackingCode = notif.complaint_tracking_code;

            return (
              <div
                key={notif.public_id || notif.id}
                className={`${s.item} ${notif.is_read ? s.itemRead : s.itemUnread}`}
                onClick={() => handleMarkRead(notif)}
              >
                {/* Visual Icon with Type Glow */}
                <div className={`${s.iconBox} ${theme.iconBgClass}`}>
                  <Icon name={theme.icon} size={22} />
                </div>

                {/* Content */}
                <div className={s.itemContent}>
                  <div className={s.itemTop}>
                    <div className={s.itemHeaderLeft}>
                      <span className={`${s.typeBadge} ${theme.themeClass}`}>
                        {theme.typeLabel}
                      </span>
                      <h4 className={s.itemTitle}>{notif.title}</h4>
                    </div>

                    <div className={s.itemHeaderRight}>
                      <span className={s.itemTime}>{formatTimeAgo(notif.created_at)}</span>
                      {!notif.is_read && (
                        <span className={s.unreadDotBadge}>
                          <span className={s.unreadPulseDot}></span>
                          <span>NEW</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className={s.itemMsg}>{notif.message}</p>

                  {/* Footer with Direct Action Button */}
                  <div className={s.itemFooter}>
                    <div className={s.footerLeft}>
                      {trackingCode && (
                        <Link
                          to={`/authority/complaints?search=${trackingCode}`}
                          className={s.queueActionBtn}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Action Incident {trackingCode}</span>
                          <Icon name="arrow_forward" size={14} />
                        </Link>
                      )}

                      {trackingCode && (
                        <span className={s.trackingCodeTag}>
                          <Icon name="tag" size={13} />
                          <span>{trackingCode}</span>
                        </span>
                      )}
                    </div>

                    <div className={s.footerRight}>
                      {!notif.is_read && (
                        <button
                          type="button"
                          className={s.markReadBtn}
                          onClick={(e) => handleMarkRead(notif, e)}
                          title="Mark this alert as read"
                        >
                          <Icon name="check" size={14} />
                          <span>Mark Read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuthorityNotifications;
