import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import useComplaintStore from '../store/complaintStore';
import IncidentMap from '../components/map/IncidentMap';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import { Complaint } from '../types/complaint';
import { formatDate } from '../utils/formatters';
import s from './MapView.module.css';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Municipal Categories' },
  { value: 'ROAD', label: 'Road & Infrastructure' },
  { value: 'WATER', label: 'Water Supply & Pipelines' },
  { value: 'ELECTRICITY', label: 'Electricity & Street Lights' },
  { value: 'SANITATION', label: 'Sanitation & Solid Waste' },
  { value: 'DRAINAGE', label: 'Drainage & Sewerage' },
  { value: 'PARKS', label: 'Parks & Environment' },
  { value: 'TRAFFIC', label: 'Traffic & Public Safety' },
  { value: 'OTHER', label: 'Municipal Administration' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending Action' },
  { value: 'IN_PROGRESS', label: 'Work In Progress' },
  { value: 'RESOLVED', label: 'Resolved & Closed' },
];

export const MapView: React.FC = () => {
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
            <h1 className={s.title}>City-Wide Incident GIS Radar & Map Insights</h1>
            <p className={s.subtitle}>
              Live spatial map of citizen grievances, nodal dispatch units, and critical hazard hotspots.
            </p>
          </div>
        </div>

        <div className={s.headerRight}>
          <Link to="/citizen/complaints/new" className={s.reportBtn}>
            <Icon name="add_location_alt" size={16} />
            <span>Pin New Grievance</span>
          </Link>
        </div>
      </div>

      {/* GIS Insights Metric Strip */}
      <div className={s.insightsBar}>
        <div className={s.insightCard}>
          <div className={s.insightIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Icon name="layers" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue}>{stats.total}</span>
            <span className={s.insightLabel}>Total Grievances</span>
          </div>
        </div>

        <div className={s.insightCard}>
          <div className={s.insightIcon} style={{ background: '#ecfdf5', color: '#10b981' }}>
            <Icon name="pin_drop" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue}>{stats.geocoded}</span>
            <span className={s.insightLabel}>Geocoded on Radar</span>
          </div>
        </div>

        <div className={s.insightCard}>
          <div className={s.insightIcon} style={{ background: '#fffbeb', color: '#d97706' }}>
            <Icon name="pending_actions" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue}>{stats.pending}</span>
            <span className={s.insightLabel}>Pending Triage</span>
          </div>
        </div>

        <div className={s.insightCard}>
          <div className={s.insightIcon} style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Icon name="engineering" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue}>{stats.inProgress}</span>
            <span className={s.insightLabel}>Work in Progress</span>
          </div>
        </div>

        <div className={s.insightCard}>
          <div className={s.insightIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <Icon name="task_alt" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue}>{stats.resolved}</span>
            <span className={s.insightLabel}>Resolved & Closed</span>
          </div>
        </div>

        <div
          className={`${s.insightCard} ${s.urgentClickable}`}
          style={{
            cursor: 'pointer',
            borderColor: urgentOnly ? '#ef4444' : '#e2e8f0',
            background: urgentOnly ? '#fef2f2' : '#ffffff',
          }}
          onClick={() => setUrgentOnly(!urgentOnly)}
          title="Click to toggle urgent filter"
        >
          <div className={s.insightIcon} style={{ background: '#fef2f2', color: '#ef4444' }}>
            <Icon name="warning" size={20} />
          </div>
          <div className={s.insightInfo}>
            <span className={s.insightValue} style={{ color: '#dc2626' }}>
              {stats.urgent}
            </span>
            <span className={s.insightLabel} style={{ color: urgentOnly ? '#dc2626' : '#64748b' }}>
              {urgentOnly ? 'Filtering Urgent' : 'Urgent Hazards'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className={s.filterRibbon}>
        <div className={s.searchBox}>
          <Input
            placeholder="Search by street name, ward, tracking code..."
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
            <span>Urgent Only</span>
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
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className={s.inspectorBody}>
              <div className={s.badgeRow}>
                <Badge variant={getStatusVariant(selectedIncident.status)}>
                  {selectedIncident.status}
                </Badge>
                <span
                  className={s.priorityPill}
                  style={{
                    color:
                      selectedIncident.priority === 'URGENT'
                        ? '#ef4444'
                        : selectedIncident.priority === 'HIGH'
                        ? '#fb923c'
                        : '#38bdf8',
                  }}
                >
                  ● {selectedIncident.priority} Priority
                </span>
              </div>

              <h3 className={s.incidentTitle}>{selectedIncident.title}</h3>
              <p className={s.incidentDesc}>{selectedIncident.description}</p>

              <div className={s.metaList}>
                <div className={s.metaItem}>
                  <Icon name="domain" size={14} style={{ color: '#fbbf24' }} />
                  <span>{selectedIncident.category_display || selectedIncident.category}</span>
                </div>

                <div className={s.metaItem}>
                  <Icon name="location_on" size={14} style={{ color: '#38bdf8' }} />
                  <span>{selectedIncident.location_address}</span>
                </div>

                {selectedIncident.latitude && selectedIncident.longitude && (
                  <div className={s.metaItem}>
                    <Icon name="pin_drop" size={14} style={{ color: '#10b981' }} />
                    <span style={{ fontFamily: 'monospace' }}>
                      {Number(selectedIncident.latitude).toFixed(6)},{' '}
                      {Number(selectedIncident.longitude).toFixed(6)}
                    </span>
                  </div>
                )}

                <div className={s.metaItem}>
                  <Icon name="schedule" size={14} style={{ color: '#94a3b8' }} />
                  <span>Reported {formatDate(selectedIncident.created_at)}</span>
                </div>
              </div>

              {/* Photo Evidence Preview */}
              {selectedIncident.images && selectedIncident.images.length > 0 && (
                <div className={s.photosSection}>
                  <span className={s.sectionLabel}>Attached Media Evidence</span>
                  <div className={s.photosGrid}>
                    {selectedIncident.images.map((img, i) => (
                      <a
                        key={img.public_id || i}
                        href={img.image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={s.photoLink}
                      >
                        <img src={img.image} alt="Incident" className={s.photoImg} />
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
                  <span>Track Full Grievance Lifecycle</span>
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
