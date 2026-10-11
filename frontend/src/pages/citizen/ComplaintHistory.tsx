import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useComplaintStore from '../../store/complaintStore';
import Icon from '../../components/ui/Icon';
import { formatDate, formatTimeAgo, truncateText } from '../../utils/formatters';
import s from './ComplaintHistory.module.css';

const STATUS_FILTERS = [
  { value: '', label: 'All Complaints' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export const ComplaintHistory: React.FC = () => {
  const { complaints, isLoading, fetchComplaints } = useComplaintStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

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
        return <span className={s.statusBadgeResolved}>Resolved</span>;
      case 'IN_PROGRESS':
      case 'ASSIGNED':
        return <span className={s.statusBadgeProgress}>In Progress</span>;
      case 'PENDING':
        return <span className={s.statusBadgePending}>Pending</span>;
      case 'REJECTED':
      case 'CLOSED':
        return <span className={s.statusBadgeRejected}>Rejected</span>;
      default:
        return <span className={s.statusBadgePending}>{status}</span>;
    }
  };

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>My Grievances</h1>
          <p className={s.subtitle}>
            View your complaints and their latest updates.
          </p>
        </div>

        <Link to="/citizen/submit" className={s.fileNewBtn}>
          <Icon name="add" size={18} />
          <span>Report a Grievance</span>
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
              placeholder="Search by title, tracking ID, or street address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className={s.categorySelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="ROAD">Roads & Infrastructure</option>
            <option value="WATER">Water Supply</option>
            <option value="ELECTRICITY">Electricity</option>
            <option value="DRAINAGE">Drainage & Sewage</option>
            <option value="SANITATION">Sanitation & Waste</option>
          </select>
        </div>

        {/* Status Filter Tabs (Section 15) */}
        <div className={s.statusTabs}>
          {STATUS_FILTERS.map((tab) => (
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

      {/* Complaints List / Cards (Section 14) */}
      {isLoading && complaints.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--cz-secondary-text, #64748b)' }}>
          <span>Loading complaints...</span>
        </div>
      ) : complaints.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <Icon name="assignment_turned_in" size={32} />
          </div>
          <h3 className={s.emptyTitle}>No grievances yet</h3>
          <p className={s.emptySubtitle}>You haven't submitted any civic complaints.</p>
          <Link to="/citizen/submit" className={s.fileNewBtn}>
            <Icon name="add" size={16} />
            <span>Report a Grievance</span>
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
                    <span className={s.detailLabel}>Category:</span>
                    <span className={s.detailValue}>{item.category_display || item.category}</span>
                  </div>
                  <div className={s.detailRow}>
                    <span className={s.detailLabel}>Department:</span>
                    <span className={s.detailValue}>
                      {item.department_name || item.category_display || 'Municipal Nodal Office'}
                    </span>
                  </div>
                  <div className={s.detailRow}>
                    <span className={s.detailLabel}>Priority:</span>
                    <span
                      className={s.detailValue}
                      style={{
                        color:
                          item.priority === 'HIGH'
                            ? '#b91c1c'
                            : item.priority === 'LOW'
                            ? '#1e6f9f'
                            : '#c25e00',
                      }}
                    >
                      {item.priority}
                    </span>
                  </div>
                  <div className={s.detailRow}>
                    <span className={s.detailLabel}>Location:</span>
                    <span className={s.detailValue}>
                      {truncateText(item.location_address || 'Central Ward', 28)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={s.cardFooter}>
                <span className={s.dateText}>
                  <Icon name="schedule" size={14} />
                  <span>{formatDate(item.created_at)}</span>
                </span>

                <Link
                  to={`/citizen/tracking?code=${item.tracking_code}`}
                  className={s.viewDetailsBtn}
                >
                  <span>View Details</span>
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
