import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useComplaintStore from '../../store/complaintStore';
import Icon from '../../components/ui/Icon';
import { formatTimeAgo } from '../../utils/formatters';
import s from './CitizenNotifications.module.css';

export const CitizenNotifications: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    notifications,
    unreadNotificationsCount,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useComplaintStore();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 4000);
    window.addEventListener('focus', fetchNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchNotifications);
    };
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'COMPLAINT_ASSIGNED':
        return 'badge';
      case 'STATUS_CHANGED':
        return 'sync';
      case 'RESOLUTION_UPDATE':
        return 'task_alt';
      case 'PRIORITY_CHANGED':
        return 'priority_high';
      default:
        return 'notifications';
    }
  };

  return (
    <div className={s.container}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>{t('nav.notifications')}</h1>
          <p className={s.subtitle}>
            {t('notificationsPage.subtitle')}
          </p>
        </div>

        {unreadNotificationsCount > 0 && (
          <button
            type="button"
            className={s.markAllBtn}
            onClick={() => markAllNotificationsAsRead()}
          >
            <Icon name="done_all" size={16} />
            <span>{t('notificationsPage.markAllRead')}</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className={s.emptyBox}>
          <div className={s.emptyIcon}>
            <Icon name="notifications_off" size={28} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#3B2418', margin: 0 }}>{t('notificationsPage.emptyTitle')}</h3>
          <p style={{ fontSize: 13, color: 'var(--cs-text-muted)', margin: 0 }}>
            {t('notificationsPage.emptyText')}
          </p>
        </div>
      ) : (
        <div className={s.notificationsList}>
          {notifications.map((notif) => (
            <div
              key={notif.public_id}
              className={`${s.notifItem} ${notif.is_read ? s.read : s.unread}`}
              onClick={() => {
                if (!notif.is_read) {
                  markNotificationAsRead(notif.public_id);
                }
              }}
            >
              <div className={s.notifIconWrapper}>
                <Icon name={getNotificationIcon(notif.notification_type)} size={20} />
              </div>

              <div className={s.notifBody}>
                <div className={s.notifTop}>
                  <h4 className={s.notifTitle}>{notif.title}</h4>
                  <span className={s.notifTime}>{formatTimeAgo(notif.created_at, i18n.language)}</span>
                </div>

                <p className={s.notifMsg}>{notif.message}</p>

                {notif.complaint_tracking_code && (
                  <div className={s.notifFooter}>
                    <Link
                      to={`/citizen/tracking?code=${notif.complaint_tracking_code}`}
                      className={s.trackLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon name="search" size={14} />
                      <span>{t('nav.trackComplaint')} ({notif.complaint_tracking_code})</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CitizenNotifications;
