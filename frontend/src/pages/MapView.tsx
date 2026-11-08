import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useComplaintStore from '../store/complaintStore';
import IncidentMap from '../components/map/IncidentMap';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import { Complaint } from '../types/complaint';
import { formatDate } from '../utils/formatters';
import s from './MapView.module.css';

// Filter values; labels come from map.view.categories / map.view.statuses ('' = all)
const CATEGORY_VALUES = ['', 'ROAD', 'WATER', 'ELECTRICITY', 'SANITATION', 'DRAINAGE', 'PARKS', 'TRAFFIC', 'OTHER'];
const STATUS_VALUES = ['', 'PENDING', 'IN_PROGRESS', 'RESOLVED'];

export const MapView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const CATEGORY_OPTIONS = CATEGORY_VALUES.map((value) => ({ value, label: t(`map.view.categories.${value || 'all'}`) }));
  const STATUS_OPTIONS = STATUS_VALUES.map((value) => ({ value, label: t(`map.view.statuses.${value || 'all'}`) }));
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';

  const { complaints, fetchComplaints } = useComplaintStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Complaint | null>(null);

  const loadMapComplaints = useCallback(
    (silent = false) => {
      fetchComplaints(
        {
          category: categoryFilter || undefined,
          status: statusFilter || undefined,
        },
        silent
      );
    },
    [categoryFilter, statusFilter, fetchComplaints]
  );

  useEffect(() => {
    loadMapComplaints(false);
    const interval = setInterval(() => {
      loadMapComplaints(true);
    }, 15000);
    const onFocus = () => loadMapComplaints(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadMapComplaints]);

  // Dynamic Geographic & Operational Insights
  const stats = useMemo(() => {
    const total = complaints.length;
    const geocoded = complaints.filter(
      (c) =>
        c.latitude !== null &&
        c.longitude !== null &&
        !isNaN(Number(c.latitude)) &&
        !isNaN(Number(c.longitude))
    ).length;
    const pending = complaints.filter((c) => c.status === 'PENDING').length;
    const inProgress = complaints.filter(
      (c) => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED'
    ).length;
    const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
    const urgent = complaints.filter((c) => c.priority === 'URGENT').length;
    return { total, geocoded, pending, inProgress, resolved, urgent };
  }, [complaints]);

  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tracking_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUrgent = !urgentOnly || c.priority === 'URGENT';

    return matchesSearch && matchesUrgent;
  });

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
      {/* Header Bar */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <div className={s.radarIcon}>
            <Icon name="explore" size={24} />
          </div>
          <div>
            <h1 className={s.title}>{t('map.view.title')}</h1>
            <p className={s.subtitle}>
              {t('map.view.subtitle')}
            </p>
          </div>
        </div>

        <div className={s.headerRight}>
          <Link to="/citizen/complaints/new" className={s.reportBtn}>
            <Icon name="add_location_alt" size={16} />
            <span>{t('map.view.pinNew')}</span>
          </Link>
        </div>
      </div>

      {/* GIS Insights Metric Strip */}
      <div className={s.insightsBar}>
        <div className={s.insightCard}>
          <div className={s.insightIcon} style={{ background: '#FFF4EC', color: '#7A1F2B' }}>
            <Icon name="layers" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue}>{stats.total}</span>
            <span className={s.insightLabel}>{t('map.view.statTotal')}</span>
          </div>
        </div>

        <div className={s.insightCard}>
          <div className={s.insightIcon} style={{ background: '#E6F4EA', color: '#1F6B3F' }}>
            <Icon name="pin_drop" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue}>{stats.geocoded}</span>
            <span className={s.insightLabel}>{t('map.view.statGeocoded')}</span>
          </div>
        </div>

        <div className={s.insightCard}>
          <div className={s.insightIcon} style={{ background: '#FDF0C4', color: '#6B4E00' }}>
            <Icon name="pending_actions" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue}>{stats.pending}</span>
            <span className={s.insightLabel}>{t('map.view.statPending')}</span>
          </div>
        </div>

        <div className={s.insightCard}>
          <div className={s.insightIcon} style={{ background: '#F6E3E5', color: '#7A1F2B' }}>
            <Icon name="engineering" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue}>{stats.inProgress}</span>
            <span className={s.insightLabel}>{t('map.view.statInProgress')}</span>
          </div>
        </div>

        <div className={s.insightCard}>
          <div className={s.insightIcon} style={{ background: '#E6F4EA', color: '#1F6B3F' }}>
            <Icon name="task_alt" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue}>{stats.resolved}</span>
            <span className={s.insightLabel}>{t('map.view.statResolved')}</span>
          </div>
        </div>

        <div
          className={`${s.insightCard} ${s.urgentClickable}`}
          style={{
            cursor: 'pointer',
            borderColor: urgentOnly ? '#B42318' : '#EADFCB',
            background: urgentOnly ? '#FDECEA' : '#FFFFFF',
          }}
          onClick={() => setUrgentOnly(!urgentOnly)}
          title={t('map.view.urgentToggleTitle')}
        >
          <div className={s.insightIcon} style={{ background: '#FDECEA', color: '#B42318' }}>
            <Icon name="warning" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue} style={{ color: '#B42318' }}>
              {stats.urgent}
            </span>
            <span className={s.insightLabel} style={{ color: urgentOnly ? '#B42318' : '#7D6657' }}>
              {urgentOnly ? t('map.view.filteringUrgent') : t('map.view.statUrgent')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className={s.filterRibbon}>
        <div className={s.searchBox}>
          <Input
            placeholder={t('map.view.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Icon name="search" size={16} />}
          />
        </div>


        <div className={s.selectsRow}>
          <div className={s.selectWrap}>
            <Select
              options={CATEGORY_OPTIONS}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>

          <div className={s.selectWrap}>
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={`${s.urgentToggle} ${urgentOnly ? s.urgentActive : ''}`}
            onClick={() => setUrgentOnly(!urgentOnly)}
          >
            <Icon name="warning" size={16} />
            <span>{t('map.view.urgentOnly')}</span>
          </button>
        </div>
      </div>

      {/* Map + Inspector Layout */}
      <div className={s.mapLayout}>
        <div className={s.mapWrapper}>
          <IncidentMap
            complaints={filteredComplaints}
            selectedComplaintId={selectedIncident?.public_id}
            onSelectComplaint={(c) => setSelectedIncident(c)}
            height="620px"
          />
        </div>

        {/* Selected Incident Drawer / Sidebar */}
        {selectedIncident && (
          <div className={s.inspectorCard}>
            <div className={s.inspectorHeader}>
              <span className={s.trackingCode}>{selectedIncident.tracking_code}</span>
              <button
                type="button"
                className={s.closeBtn}
                onClick={() => setSelectedIncident(null)}
                aria-label={t('map.view.close')}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className={s.inspectorBody}>
              <div className={s.badgeRow}>
                <Badge variant={getStatusVariant(selectedIncident.status)}>
                  {t(`statuses.${selectedIncident.status}`, { defaultValue: selectedIncident.status })}
                </Badge>
                <span
                  className={s.priorityPill}
                  style={{
                    color:
                      selectedIncident.priority === 'URGENT'
                        ? '#B42318'
                        : selectedIncident.priority === 'HIGH'
                        ? '#B93E0C'
                        : '#7D6657',
                  }}
                >
                  ● {t(`priorities.${selectedIncident.priority}`, { defaultValue: selectedIncident.priority })}
                </span>
              </div>

              <h3 className={s.incidentTitle}>{selectedIncident.title}</h3>
              <p className={s.incidentDesc}>{selectedIncident.description}</p>

              <div className={s.metaList}>
                <div className={s.metaItem}>
                  <Icon name="domain" size={14} style={{ color: '#6B4E00' }} />
                  <span>{t(`categories.${selectedIncident.category}`, { defaultValue: selectedIncident.category_display || selectedIncident.category })}</span>
                </div>

                <div className={s.metaItem}>
                  <Icon name="location_on" size={14} style={{ color: '#7A1F2B' }} />
                  <span>{selectedIncident.location_address}</span>
                </div>

                {selectedIncident.latitude && selectedIncident.longitude && (
                  <div className={s.metaItem}>
                    <Icon name="pin_drop" size={14} style={{ color: '#2E7D4F' }} />
                    <span style={{ fontFamily: 'monospace' }}>
                      {Number(selectedIncident.latitude).toFixed(6)},{' '}
                      {Number(selectedIncident.longitude).toFixed(6)}
                    </span>
                  </div>
                )}

                <div className={s.metaItem}>
                  <Icon name="schedule" size={14} style={{ color: '#857060' }} />
                  <span>{t('map.view.reported', { date: formatDate(selectedIncident.created_at, i18n.language) })}</span>
                </div>
              </div>

              {/* Photo Evidence Preview */}
              {selectedIncident.images && selectedIncident.images.length > 0 && (
                <div className={s.photosSection}>
                  <span className={s.sectionLabel}>{t('map.view.mediaEvidence')}</span>
                  <div className={s.photosGrid}>
                    {selectedIncident.images.map((img, i) => (
                      <a
                        key={img.public_id || i}
                        href={img.image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={s.photoLink}
                      >
                        <img src={img.image} alt={t('map.view.incidentAlt')} className={s.photoImg} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className={s.inspectorFooter}>
                <Link
                  to={`/citizen/tracking?code=${selectedIncident.tracking_code}`}
                  className={s.trackBtn}
                >
                  <span>{t('map.view.trackFull')}</span>
                  <Icon name="arrow_forward" size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
