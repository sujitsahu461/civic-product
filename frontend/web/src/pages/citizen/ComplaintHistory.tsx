import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useComplaintStore from '../../store/complaintStore';
import Icon from '../../components/ui/Icon';
import { formatDate, truncateText } from '../../utils/formatters';
import s from './ComplaintHistory.module.css';

export const ComplaintHistory: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { complaints, isLoading, fetchComplaints } = useComplaintStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const statusFilters = [
    { value: '', label: t('common.all') },
    { value: 'PENDING', label: t('statuses.PENDING') },
    { value: 'IN_PROGRESS', label: t('statuses.IN_PROGRESS') },
    { value: 'RESOLVED', label: t('statuses.RESOLVED') },
    { value: 'REJECTED', label: t('statuses.REJECTED') },
  ];

  const categories = [
    'ROAD',
    'WATER',
    'ELECTRICITY',
    'DRAINAGE',
    'SANITATION',
    'PARKS',
    'NOISE',
    'OTHER',
  ];

  const loadComplaints = (silent = false) => {
    fetchComplaints(
      {
        q: searchTerm || undefined,
        status: selectedStatus || undefined,
        category: selectedCategory || undefined,
      },
      silent
    );
  };

  useEffect(() => {
    loadComplaints(complaints.length > 0);
    const interval = setInterval(() => {
      loadComplaints(true);
    }, 4000);
    const onFocus = () => loadComplaints(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [selectedStatus, selectedCategory, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <span className={s.statusBadgeResolved}>{t('statuses.RESOLVED')}</span>;
      case 'IN_PROGRESS':
      case 'ASSIGNED':
        return <span className={s.statusBadgeProgress}>{t('statuses.IN_PROGRESS')}</span>;
      case 'PENDING':
        return <span className={s.statusBadgePending}>{t('statuses.PENDING')}</span>;
      case 'REJECTED':
      case 'CLOSED':
        return <span className={s.statusBadgeRejected}>{t('statuses.REJECTED')}</span>;
      default:
        return <span className={s.statusBadgePending}>{status}</span>;
    }
  };

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>{t('history.title')}</h1>
          <p className={s.subtitle}>{t('history.subtitle')}</p>
        </div>

        <Link to="/citizen/complaints/new" className={s.fileNewBtn}>
          <Icon name="add" size={18} />
          <span>{t('nav.reportIssue')}</span>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className={s.toolbarCard}>
        <div className={s.searchRow}>
          <div className={s.searchWrap}>
            <Icon name="search" size={18} className={s.searchIcon} />
            <input
              type="text"
              className={s.searchInput}
              placeholder={t('history.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className={s.categorySelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">{t('common.all')} {t('common.category')}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {t(`categories.${cat}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div className={s.statusTabs}>
          {statusFilters.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`${s.statusTab} ${selectedStatus === tab.value ? s.activeStatusTab : ''}`}
              onClick={() => setSelectedStatus(tab.value)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List / Cards */}
      {isLoading && complaints.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--cs-text-muted)' }}>
          <span>{t('common.loading')}</span>
        </div>
      ) : complaints.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <Icon name="assignment_turned_in" size={32} />
          </div>
          <h3 className={s.emptyTitle}>{t('history.emptyTitle')}</h3>
          <p className={s.emptySubtitle}>{t('history.emptyDesc')}</p>
          <Link to="/citizen/complaints/new" className={s.fileNewBtn}>
            <Icon name="add" size={16} />
            <span>{t('history.fileFirstBtn')}</span>
          </Link>
        </div>
      ) : (
        <div className={s.complaintsGrid}>
          {complaints.map((item) => (
            <div key={item.public_id} className={s.complaintCard}>
              <div className={s.cardTop}>
                <span className={s.trackingCode}>{item.tracking_code}</span>
                {getStatusBadge(item.status)}
              </div>

              <div className={s.cardBody}>
                <h3 className={s.cardTitle}>{item.title}</h3>
                <p className={s.cardDesc}>{truncateText(item.description, 110)}</p>

                <div className={s.detailsList}>
                  <div className={s.detailRow}>
                    <span className={s.detailLabel}>{t('common.category')}:</span>
                    <span className={s.detailValue}>
                      {t(`categories.${item.category}`) || item.category_display || item.category}
                    </span>
                  </div>
                  <div className={s.detailRow}>
                    <span className={s.detailLabel}>{t('submit.assignedDept')}:</span>
                    <span className={s.detailValue}>
                      {item.department_name || item.category_display || 'Municipal Nodal Office'}
                    </span>
                  </div>
                  <div className={s.detailRow}>
                    <span className={s.detailLabel}>{t('common.priority')}:</span>
                    <span
                      className={s.detailValue}
                      style={{
                        color:
                          item.priority === 'HIGH' || item.priority === 'URGENT'
                            ? '#912018'
                            : item.priority === 'LOW'
                            ? '#5A4033'
                            : '#B93E0C',
                      }}
                    >
                      {t(`priorities.${item.priority}`) || item.priority}
                    </span>
                  </div>
                  <div className={s.detailRow}>
                    <span className={s.detailLabel}>{t('common.location')}:</span>
                    <span className={s.detailValue}>
                      {truncateText(item.location_address || 'Central Ward', 28)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={s.cardFooter}>
                <span className={s.dateText}>
                  <Icon name="schedule" size={14} />
                  <span>{formatDate(item.created_at, i18n.language)}</span>
                </span>

                <Link
                  to={`/citizen/tracking?code=${item.tracking_code}`}
                  className={s.viewDetailsBtn}
                >
                  <span>{t('common.viewDetails')}</span>
                  <Icon name="arrow_forward" size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComplaintHistory;
