import React, { useEffect, useState } from 'react';
import adminService from '../../services/admin.service';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import { Complaint } from '../../types/complaint';
import { formatDate, formatTimeAgo, truncateText } from '../../utils/formatters';
import s from './SystemComplaintManagement.module.css';

export const SystemComplaintManagement: React.FC = () => {
  const { error: toastError, success } = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, priorityFilter]);

  const loadComplaints = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getSystemComplaints({
        q: searchTerm || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });
      const list = Array.isArray(data) ? data : data.results || [];
      setComplaints(list);
    } catch {
      toastError('Failed to load system complaints.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadComplaints();
  };

  const exportCSV = () => {
    if (complaints.length === 0) return;
    const headers = ['Tracking Code', 'Title', 'Category', 'Priority', 'Status', 'Citizen', 'Address', 'Created At'];
    const rows = complaints.map((c) => [
      c.tracking_code,
      `"${c.title.replace(/"/g, '""')}"`,
      c.category,
      c.priority,
      c.status,
      `"${c.citizen_name || 'Citizen'}"`,
      `"${c.location_address.replace(/"/g, '""')}"`,
      c.created_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CivicSetu_Grievances_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('CSV Report exported successfully.');
  };

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
      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Platform Grievance Governance</h1>
          <p className={s.subtitle}>
            System-wide incident audit logs, cross-department routing, and compliance exports.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={exportCSV}
          leftIcon={<Icon name="download" size={16} />}
        >
          Export CSV Registry
        </Button>
      </div>

      {/* Filter Bar */}
      <div className={s.filterBar}>
        <form onSubmit={handleSearchSubmit} className={s.searchForm}>
          <Input
            placeholder="Search by Tracking Code, Title, Keyword, Citizen name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Icon name="search" size={18} />}
          />
        </form>

        <div className={s.filtersRow}>
          <div className={s.selectWrapper}>
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'ASSIGNED', label: 'Assigned' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>

          <div className={s.selectWrapper}>
            <Select
              options={[
                { value: '', label: 'All Priorities' },
                { value: 'URGENT', label: 'Urgent' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className={s.loadingBox}>
          <span className={s.spinner}></span>
          <span>Loading platform complaints repository...</span>
        </div>
      ) : complaints.length === 0 ? (
        <div className={s.emptyBox}>
          <Icon name="folder_off" size={40} style={{ color: '#64748b' }} />
          <h3>No Incidents Found</h3>
          <p>No complaints match your active filter parameters.</p>
        </div>
      ) : (
        <div className={s.tableCard}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Tracking Code</th>
                <th>Incident Details</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Citizen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.public_id || c.tracking_code}>
                  <td className={s.codeCell}>
                    <span className={s.code}>{c.tracking_code}</span>
                    <span className={s.timeAgo}>{formatTimeAgo(c.created_at)}</span>
                  </td>

                  <td className={s.titleCell}>
                    <div className={s.itemTitle}>{c.title}</div>
                    <div className={s.itemAddr}>
                      <Icon name="location_on" size={12} />
                      <span>{truncateText(c.location_address, 35)}</span>
                    </div>
                  </td>

                  <td>
                    <span className={s.categoryBadge}>{c.category_display || c.category}</span>
                  </td>

                  <td>
                    <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                  </td>

                  <td>
                    <span
                      className={s.priorityTag}
                      style={{
                        color:
                          c.priority === 'URGENT'
                            ? '#ef4444'
                            : c.priority === 'HIGH'
                            ? '#fb923c'
                            : '#38bdf8',
                      }}
                    >
                      ● {c.priority}
                    </span>
                  </td>

                  <td>
                    <div className={s.citizenName}>{c.citizen_name || 'Citizen'}</div>
                  </td>

                  <td>
                    <button
                      type="button"
                      className={s.btnInspect}
                      onClick={() => {
                        setSelectedComplaint(c);
                        setIsDetailModalOpen(true);
                      }}
                      title="Inspect Dossier"
                    >
                      <Icon name="visibility" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Dossier Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Audit Dossier: ${selectedComplaint?.tracking_code}`}
        maxWidth="680px"
      >
        {selectedComplaint && (
          <div className={s.modalBody}>
            <div className={s.modalHeaderRow}>
              <div>
                <h3 className={s.modalTitle}>{selectedComplaint.title}</h3>
                <p className={s.modalSubtitle}>{selectedComplaint.location_address}</p>
              </div>
              <Badge variant={getStatusVariant(selectedComplaint.status)}>
                {selectedComplaint.status}
              </Badge>
            </div>

            <div className={s.modalMetaGrid}>
              <div className={s.metaBox}>
                <span className={s.metaLabel}>Category</span>
                <span className={s.metaVal}>{selectedComplaint.category_display || selectedComplaint.category}</span>
              </div>
              <div className={s.metaBox}>
                <span className={s.metaLabel}>Priority</span>
                <span className={s.metaVal} style={{ color: '#fb923c' }}>{selectedComplaint.priority}</span>
              </div>
              <div className={s.metaBox}>
                <span className={s.metaLabel}>Citizen</span>
                <span className={s.metaVal}>{selectedComplaint.citizen_name || 'Citizen'}</span>
              </div>
              <div className={s.metaBox}>
                <span className={s.metaLabel}>Filed Timestamp</span>
                <span className={s.metaVal}>{formatDate(selectedComplaint.created_at)}</span>
              </div>
            </div>

            <div className={s.descBox}>
              <span className={s.metaLabel}>Description</span>
              <p className={s.descText}>{selectedComplaint.description}</p>
            </div>

            {selectedComplaint.resolution_notes && (
              <div className={s.resolutionBanner}>
                <Icon name="verified" size={18} style={{ color: '#34d399' }} />
                <div>
                  <strong>Official Resolution Notes:</strong>
                  <p>{selectedComplaint.resolution_notes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SystemComplaintManagement;
