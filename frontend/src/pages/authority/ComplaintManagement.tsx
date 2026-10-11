import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import authorityService from '../../services/authority.service';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import { Complaint, ComplaintPriority, ComplaintStatus } from '../../types/complaint';
import { formatDate, formatTimeAgo, truncateText } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/error';
import s from './ComplaintManagement.module.css';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending Triage' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'Work In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export const ComplaintManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const { success, error: toastError } = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Selected complaint for modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);

  // Form states
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('IN_PROGRESS');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [newPriority, setNewPriority] = useState<ComplaintPriority>('HIGH');
  const [priorityRemarks, setPriorityRemarks] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImage, setResolutionImage] = useState<File | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const loadComplaints = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await authorityService.getComplaints({
        q: searchTerm,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });

      if (Array.isArray(data)) {
        setComplaints(data);
        setTotalCount(data.length);
      } else if (data?.results) {
        setComplaints(data.results);
        setTotalCount(data.count || data.results.length);
      } else {
        setComplaints([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      if (!silent) {
        if (err?.response?.status === 403) {
          toastError('Municipal authority authorization required to access queue.');
        } else {
          toastError('Failed to load department complaint queue.');
        }
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints(false);
    const interval = setInterval(() => {
      // only poll silently if no modal is actively in use
      if (!isStatusModalOpen && !isPriorityModalOpen && !isResolutionModalOpen) {
        loadComplaints(true);
      }
    }, 3500);

    const onFocus = () => {
      if (!isStatusModalOpen && !isPriorityModalOpen && !isResolutionModalOpen) {
        loadComplaints(true);
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [statusFilter, priorityFilter, searchTerm, isStatusModalOpen, isPriorityModalOpen, isResolutionModalOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadComplaints();
  };

  const openDetailModal = async (c: Complaint) => {
    try {
      const detail = await authorityService.getComplaintDetail(c.public_id);
      setSelectedComplaint(detail);
    } catch {
      setSelectedComplaint(c);
    }
    setIsDetailModalOpen(true);
  };

  const getAvailableStatusOptions = (currentStatus?: ComplaintStatus) => {
    switch (currentStatus) {
      case 'PENDING':
        return [
          { value: 'ASSIGNED', label: 'ASSIGNED — Nodal officer assigned' },
          { value: 'IN_PROGRESS', label: 'IN PROGRESS — Field crew dispatched' },
          { value: 'RESOLVED', label: 'RESOLVED — Redressal completed' },
          { value: 'REJECTED', label: 'REJECTED — Out of municipal scope / invalid' },
        ];
      case 'ASSIGNED':
        return [
          { value: 'IN_PROGRESS', label: 'IN PROGRESS — Field crew dispatched' },
          { value: 'RESOLVED', label: 'RESOLVED — Redressal completed' },
          { value: 'REJECTED', label: 'REJECTED — Out of municipal scope / invalid' },
          { value: 'PENDING', label: 'PENDING — Return to pending triage' },
        ];
      case 'IN_PROGRESS':
        return [
          { value: 'RESOLVED', label: 'RESOLVED — Redressal completed' },
          { value: 'CLOSED', label: 'CLOSED — Administrative archival' },
          { value: 'ASSIGNED', label: 'ASSIGNED — Reassign nodal officer' },
          { value: 'REJECTED', label: 'REJECTED — Out of municipal scope / invalid' },
          { value: 'PENDING', label: 'PENDING — Return to pending triage' },
        ];
      case 'RESOLVED':
        return [
          { value: 'CLOSED', label: 'CLOSED — Administrative archival' },
        ];
      case 'REJECTED':
        return [
          { value: 'CLOSED', label: 'CLOSED — Administrative archival' },
          { value: 'IN_PROGRESS', label: 'IN PROGRESS — Reopen and dispatch crew' },
        ];
      case 'CLOSED':
        return [
          { value: 'RESOLVED', label: 'RESOLVED — Redressal completed' },
          { value: 'IN_PROGRESS', label: 'IN PROGRESS — Reopen and dispatch crew' },
        ];
      default:
        return [
          { value: 'ASSIGNED', label: 'ASSIGNED — Nodal officer assigned' },
          { value: 'IN_PROGRESS', label: 'IN PROGRESS — Field crew dispatched' },
          { value: 'RESOLVED', label: 'RESOLVED — Redressal completed' },
          { value: 'REJECTED', label: 'REJECTED — Out of municipal scope / invalid' },
          { value: 'CLOSED', label: 'CLOSED — Administrative archival' },
        ];
    }
  };

  const openStatusModal = (c: Complaint) => {
    setSelectedComplaint(c);
    const available = getAvailableStatusOptions(c.status);
    setNewStatus((available[0]?.value as ComplaintStatus) || 'IN_PROGRESS');
    setStatusRemarks('');
    setIsStatusModalOpen(true);
  };

  const openPriorityModal = (c: Complaint) => {
    setSelectedComplaint(c);
    setNewPriority(c.priority);
    setPriorityRemarks('');
    setIsPriorityModalOpen(true);
  };

  const openResolutionModal = (c: Complaint) => {
    setSelectedComplaint(c);
    setResolutionNotes(c.resolution_notes || '');
    setResolutionImage(null);
    setIsResolutionModalOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setModalLoading(true);
    try {
      await authorityService.updateComplaintStatus(
        selectedComplaint.public_id,
        newStatus,
        statusRemarks
      );
      success(`Complaint ${selectedComplaint.tracking_code} status updated to ${newStatus}.`);
      setIsStatusModalOpen(false);
      loadComplaints();
    } catch (err: any) {
      toastError(getApiErrorMessage(err, 'Failed to update status.'));
    } finally {
      setModalLoading(false);
    }
  };

  const handlePrioritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setModalLoading(true);
    try {
      await authorityService.updatePriority(
        selectedComplaint.public_id,
        newPriority,
        priorityRemarks
      );
      success(`Complaint ${selectedComplaint.tracking_code} priority updated to ${newPriority}.`);
      setIsPriorityModalOpen(false);
      loadComplaints();
    } catch (err: any) {
      toastError(getApiErrorMessage(err, 'Failed to update priority.'));
    } finally {
      setModalLoading(false);
    }
  };

  const handleResolutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setModalLoading(true);
    try {
      if (resolutionNotes) {
        await authorityService.updateResolutionNotes(selectedComplaint.public_id, resolutionNotes);
      }
      if (resolutionImage) {
        await authorityService.uploadResolutionImage(
          selectedComplaint.public_id,
          resolutionImage,
          'Resolution Proof'
        );
      }
      // Only transition to RESOLVED if not already in RESOLVED status
      if (selectedComplaint.status !== 'RESOLVED') {
        await authorityService.updateComplaintStatus(
          selectedComplaint.public_id,
          'RESOLVED',
          resolutionNotes || 'Grievance work completed and verified by officer.'
        );
      }
      success(`Complaint ${selectedComplaint.tracking_code} resolution updated successfully.`);
      setIsResolutionModalOpen(false);
      loadComplaints();
    } catch (err: any) {
      toastError(getApiErrorMessage(err, 'Failed to upload resolution.'));
    } finally {
      setModalLoading(false);
    }
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
          <h1 className={s.title}>Authority Grievance Work Queue</h1>
          <p className={s.subtitle}>
            Triage, assign maintenance crews, escalate priorities, and upload verified closure proofs.
          </p>
        </div>

        <div className={s.queueCountBadge}>
          <Icon name="dns" size={16} />
          <span>Active Queue: {totalCount} Records</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={s.filterBar}>
        <form onSubmit={handleSearchSubmit} className={s.searchForm}>
          <Input
            placeholder="Search by Tracking Code, Keyword, Citizen name, Address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Icon name="search" size={18} />}
          />
        </form>

        <div className={s.filtersRow}>
          <div className={s.selectWrapper}>
            <Select
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>

          <div className={s.selectWrapper}>
            <Select
              options={PRIORITY_FILTER_OPTIONS}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Table View */}
      {isLoading ? (
        <div className={s.loadingBox}>
          <span className={s.spinner}></span>
          <span>Loading queue items...</span>
        </div>
      ) : complaints.length === 0 ? (
        <div className={s.emptyBox}>
          <Icon name="check_circle" size={48} style={{ color: '#10b981' }} />
          <h3>Queue is Empty</h3>
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
                <th>Citizen Contact</th>
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
                        background:
                          c.priority === 'URGENT'
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      {c.priority}
                    </span>
                  </td>

                  <td>
                    <div className={s.citizenName}>{c.citizen_name || 'Citizen'}</div>
                    {c.feedback_rating ? (
                      <div className={s.tableFeedbackBadge} title={c.feedback_comments || `Rated ${c.feedback_rating}/5`}>
                        <span className={s.starIconGold}>★</span>
                        <span className={s.ratingNum}>{c.feedback_rating}/5</span>
                      </div>
                    ) : c.status === 'RESOLVED' ? (
                      <span className={s.noFeedbackPill}>Awaiting Rating</span>
                    ) : null}
                  </td>

                  <td>
                    <div className={s.actionBtnGroup}>
                      <button
                        type="button"
                        className={s.actionBtnInspect}
                        onClick={() => openDetailModal(c)}
                        title="Inspect Full Details"
                      >
                        <Icon name="visibility" size={16} />
                      </button>

                      <button
                        type="button"
                        className={s.actionBtnStatus}
                        onClick={() => openStatusModal(c)}
                        title="Update Status"
                      >
                        <Icon name="change_circle" size={16} />
                      </button>

                      <button
                        type="button"
                        className={s.actionBtnPriority}
                        onClick={() => openPriorityModal(c)}
                        title="Change Priority"
                      >
                        <Icon name="flag" size={16} />
                      </button>

                      <button
                        type="button"
                        className={s.actionBtnResolve}
                        onClick={() => openResolutionModal(c)}
                        title="Upload Resolution Proof & Close"
                      >
                        <Icon name="task_alt" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 1. Complaint Full Inspection Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Grievance Dossier: ${selectedComplaint?.tracking_code}`}
        maxWidth="680px"
      >
        {selectedComplaint && (
          <div className={s.modalContent}>
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
                <span className={s.metaVal}>
                  {selectedComplaint.category_display || selectedComplaint.category}
                </span>
              </div>
              <div className={s.metaBox}>
                <span className={s.metaLabel}>Priority</span>
                <span className={s.metaVal} style={{ color: '#fb923c' }}>
                  {selectedComplaint.priority}
                </span>
              </div>
              <div className={s.metaBox}>
                <span className={s.metaLabel}>Citizen</span>
                <span className={s.metaVal}>
                  {selectedComplaint.citizen?.full_name || selectedComplaint.citizen_name || 'Citizen'}
                </span>
              </div>
              <div className={s.metaBox}>
                <span className={s.metaLabel}>Filed Timestamp</span>
                <span className={s.metaVal}>{formatDate(selectedComplaint.created_at)}</span>
              </div>
            </div>

            <div className={s.modalSection}>
              <h4 className={s.sectionTitle}>Full Grievance Description</h4>
              <p className={s.descBox}>{selectedComplaint.description}</p>
            </div>

            {/* Evidence Photos */}
            {selectedComplaint.images && selectedComplaint.images.length > 0 && (
              <div className={s.modalSection}>
                <h4 className={s.sectionTitle}>Attached Photos ({selectedComplaint.images.length})</h4>
                <div className={s.photosGrid}>
                  {selectedComplaint.images.map((img, i) => (
                    <a
                      key={img.public_id || i}
                      href={img.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.photoLink}
                    >
                      <img src={img.image} alt={`Evidence ${i + 1}`} className={s.modalThumb} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Notes if available */}
            {selectedComplaint.resolution_notes && (
              <div className={s.resolutionBanner}>
                <Icon name="verified" size={20} style={{ color: '#34d399' }} />
                <div>
                  <strong>Resolution Remarks:</strong>
                  <p>{selectedComplaint.resolution_notes}</p>
                </div>
              </div>
            )}

            {/* Citizen Feedback with Stars & Comments if available */}
            {selectedComplaint.feedback && (
              <div className={s.citizenFeedbackDossierCard}>
                <div className={s.citizenFeedbackHeader}>
                  <div className={s.citizenFeedbackRatingBox}>
                    <div className={s.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={
                            star <= selectedComplaint.feedback!.rating
                              ? s.starGold
                              : s.starGray
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className={s.ratingScoreLabel}>
                      {selectedComplaint.feedback.rating}.0 / 5.0
                    </span>
                  </div>
                  <Badge variant="success">Citizen Feedback & Rating</Badge>
                </div>

                <div className={s.citizenFeedbackComment}>
                  "{selectedComplaint.feedback.comments || 'Citizen confirmed grievance was resolved successfully without additional remarks.'}"
                </div>

                <div className={s.citizenFeedbackMeta}>
                  <span>Submitted by: <strong>{selectedComplaint.feedback.citizen_name || selectedComplaint.citizen_name || 'Citizen'}</strong></span>
                  {selectedComplaint.feedback.created_at && (
                    <>
                      <span>•</span>
                      <span>{formatDate(selectedComplaint.feedback.created_at)}</span>
                    </>
                  )}
                  {selectedComplaint.feedback.satisfaction_level && (
                    <>
                      <span>•</span>
                      <span className={s.metaTag}>{selectedComplaint.feedback.satisfaction_level.replace('_', ' ')}</span>
                    </>
                  )}
                  {selectedComplaint.feedback.timeliness && (
                    <>
                      <span>•</span>
                      <span className={s.metaTag}>{selectedComplaint.feedback.timeliness.replace('_', ' ')}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className={s.modalFooter}>
              <Button
                variant="ghost"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close Dossier
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  openResolutionModal(selectedComplaint);
                }}
                leftIcon={<Icon name="task_alt" size={16} />}
              >
                Resolve Grievance
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2. Status Update Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Dispatch Status"
      >
        <form onSubmit={handleStatusSubmit} className={s.modalForm}>
          <p className={s.modalPrompt}>
            Transition the workflow state for <strong>{selectedComplaint?.tracking_code}</strong>.
          </p>

          <Select
            label="New Workflow Status"
            options={getAvailableStatusOptions(selectedComplaint?.status)}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
            required
          />

          <div className={s.inputGroup}>
            <label className={s.label}>Official Departmental Remarks</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Field inspection team dispatched to site at 10:30 AM..."
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
            />
          </div>

          <div className={s.modalActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={modalLoading}
            >
              Confirm Status Transition
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Priority Update Modal */}
      <Modal
        isOpen={isPriorityModalOpen}
        onClose={() => setIsPriorityModalOpen(false)}
        title="Escalate / Adjust Priority"
      >
        <form onSubmit={handlePrioritySubmit} className={s.modalForm}>
          <p className={s.modalPrompt}>
            Adjust urgency level for <strong>{selectedComplaint?.tracking_code}</strong>.
          </p>

          <Select
            label="Priority Classification"
            options={[
              { value: 'LOW', label: 'LOW — Standard maintenance backlog' },
              { value: 'MEDIUM', label: 'MEDIUM — Normal priority grievance' },
              { value: 'HIGH', label: 'HIGH — Elevated public concern' },
              { value: 'URGENT', label: 'URGENT — Immediate public hazard / Emergency' },
            ]}
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as ComplaintPriority)}
            required
          />

          <div className={s.inputGroup}>
            <label className={s.label}>Rationale for Priority Adjustment</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Heavy rainfall forecasted, risk of road collapse requires urgent response..."
              value={priorityRemarks}
              onChange={(e) => setPriorityRemarks(e.target.value)}
            />
          </div>

          <div className={s.modalActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPriorityModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={modalLoading}
            >
              Update Priority
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Resolution Proof & Closure Modal */}
      <Modal
        isOpen={isResolutionModalOpen}
        onClose={() => setIsResolutionModalOpen(false)}
        title="Resolution Proof & Grievance Closure"
      >
        <form onSubmit={handleResolutionSubmit} className={s.modalForm}>
          <p className={s.modalPrompt}>
            Provide official closure notes and optional photographic proof for <strong>{selectedComplaint?.tracking_code}</strong>.
          </p>

          <div className={s.inputGroup}>
            <label className={s.label}>Resolution Summary Notes *</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Road surface re-asphalted and cured. Site inspected and confirmed clear."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              required
            />
          </div>

          <div className={s.inputGroup}>
            <label className={s.label}>Upload Resolution Proof Photo (Optional)</label>
            <input
              type="file"
              accept="image/*"
              className={s.fileInput}
              onChange={(e) => setResolutionImage(e.target.files ? e.target.files[0] : null)}
            />
          </div>

          <div className={s.modalActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsResolutionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={modalLoading}
              leftIcon={<Icon name="verified" size={16} />}
            >
              Mark Grievance Resolved
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ComplaintManagement;
