import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useComplaintStore from '../../store/complaintStore';
import feedbackService from '../../services/feedback.service';
import { useToast } from '../../components/ui/Toast';
import Icon from '../../components/ui/Icon';
import { formatDate, formatTimeAgo } from '../../utils/formatters';
import s from './TrackComplaint.module.css';

export const TrackComplaint: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const { selectedComplaint, timeline, isLoading, error, trackComplaint, fetchTimeline } =
    useComplaintStore();
  const { error: toastError, success } = useToast();

  const [inputCode, setInputCode] = useState(initialCode);
  const [rating, setRating] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleSearch = async (codeToSearch: string, silent = false) => {
    if (!codeToSearch.trim()) return;
    try {
      const data = await trackComplaint(codeToSearch.trim());
      if (!silent) setSearchParams({ code: codeToSearch.trim() });
      if (data.public_id) {
        fetchTimeline(data.public_id);
      }
    } catch (err: any) {
      if (!silent) toastError('No grievance found with this tracking code. Please verify.');
    }
  };

  useEffect(() => {
    if (initialCode) {
      handleSearch(initialCode, false);
      const interval = setInterval(() => {
        handleSearch(initialCode, true);
      }, 4000);

      const onFocus = () => handleSearch(initialCode, true);
      window.addEventListener('focus', onFocus);
      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', onFocus);
      };
    }
  }, [initialCode]);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(inputCode);
  };

  const getStepStatus = (stepIndex: number) => {
    if (!selectedComplaint) return 'pending';
    const status = selectedComplaint.status;

    if (status === 'REJECTED' || status === 'CLOSED') {
      return stepIndex === 0 ? 'completed' : 'rejected';
    }

    if (status === 'RESOLVED') return 'completed';
    if (status === 'IN_PROGRESS') {
      if (stepIndex < 2) return 'completed';
      if (stepIndex === 2) return 'active';
      return 'pending';
    }
    if (status === 'ASSIGNED') {
      if (stepIndex < 1) return 'completed';
      if (stepIndex === 1) return 'active';
      return 'pending';
    }
    // PENDING
    if (stepIndex === 0) return 'active';
    return 'pending';
  };

  const steps = [
    {
      title: 'Complaint Submitted',
      desc: 'Registered into municipal database and verified by system.',
      icon: 'receipt_long',
    },
    {
      title: 'Complaint Reviewed & Assigned',
      desc: selectedComplaint?.assigned_authority_name
        ? `Assigned to ${selectedComplaint.assigned_authority_name}`
        : 'Assigned to jurisdictional Nodal Department.',
      icon: 'badge',
    },
    {
      title: 'Work In Progress',
      desc: selectedComplaint?.status === 'IN_PROGRESS'
        ? 'Municipal team dispatched on site for field repairs.'
        : 'Awaiting field engineer deployment.',
      icon: 'engineering',
    },
    {
      title: 'Resolved',
      desc: selectedComplaint?.resolution_notes
        ? selectedComplaint.resolution_notes
        : 'Field resolution verification and final closure.',
      icon: 'task_alt',
    },
  ];

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

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setIsSubmittingFeedback(true);
    try {
      await feedbackService.submitFeedback({
        complaint_public_id: selectedComplaint.public_id,
        rating,
        comments: feedbackNotes,
      });
      success('Thank you for rating municipal grievance redressal!');
      setFeedbackSubmitted(true);
    } catch {
      toastError('Could not submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <h1 className={s.title}>Track Your Grievance</h1>
        <p className={s.subtitle}>
          Enter your unique Tracking Code to monitor real-time department assignment and resolution timeline.
        </p>
      </div>

      {/* Public Tracking Input Card (Section 17) */}
      <div className={s.searchCard}>
        <form onSubmit={handleSubmitSearch} className={s.searchForm}>
          <div className={s.inputWrap}>
            <Icon name="search" size={20} className={s.searchIcon} />
            <input
              type="text"
              className={s.trackingInput}
              placeholder="e.g. CMP-20260927-YC3V"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              required
            />
          </div>

          <button type="submit" disabled={isLoading} className={s.trackBtn}>
            <Icon name="search" size={17} />
            <span>{isLoading ? 'Searching...' : 'Track Complaint'}</span>
          </button>
        </form>
      </div>

      {/* Tracking Result View */}
      {selectedComplaint && (
        <div className={s.resultCard}>
          <div className={s.resultTop}>
            <div className={s.codeBox}>
              <span className={s.codeLabel}>Tracking Code</span>
              <span className={s.codeText}>{selectedComplaint.tracking_code}</span>
            </div>

            {getStatusBadge(selectedComplaint.status)}
          </div>

          <div>
            <h2 className={s.complaintTitle}>{selectedComplaint.title}</h2>
            <p className={s.complaintDesc}>{selectedComplaint.description}</p>
          </div>

          {/* Key Metadata Grid */}
          <div className={s.metaGrid}>
            <div className={s.metaItem}>
              <span className={s.metaLabel}>Category</span>
              <span className={s.metaVal}>
                {selectedComplaint.category_display || selectedComplaint.category}
              </span>
            </div>

            <div className={s.metaItem}>
              <span className={s.metaLabel}>Department</span>
              <span className={s.metaVal}>
                {selectedComplaint.department_name || 'Municipal Office'}
              </span>
            </div>

            <div className={s.metaItem}>
              <span className={s.metaLabel}>Priority</span>
              <span
                className={s.metaVal}
                style={{
                  color:
                    selectedComplaint.priority === 'HIGH'
                      ? '#b91c1c'
                      : selectedComplaint.priority === 'LOW'
                      ? '#1e6f9f'
                      : '#c25e00',
                }}
              >
                {selectedComplaint.priority}
              </span>
            </div>

            <div className={s.metaItem}>
              <span className={s.metaLabel}>Submitted</span>
              <span className={s.metaVal}>{formatDate(selectedComplaint.created_at)}</span>
            </div>
          </div>

          {/* Vertical Timeline (Section 16) */}
          <div className={s.timelineSection}>
            <h3 className={s.timelineTitle}>Redressal Timeline</h3>

            <div className={s.timelineTrack}>
              {steps.map((st, index) => {
                const stepState = getStepStatus(index);
                const isCompleted = stepState === 'completed';
                const isActive = stepState === 'active';
                const isRejected = stepState === 'rejected';

                let circleClass = s.stepCirclePending;
                if (isCompleted) circleClass = s.stepCircleCompleted;
                if (isActive) circleClass = s.stepCircleActive;
                if (isRejected) circleClass = s.stepCircleRejected;

                return (
                  <div
                    key={st.title}
                    className={`${s.timelineStep} ${isCompleted ? s.timelineStepCompleted : ''}`}
                  >
                    <div className={`${s.stepCircle} ${circleClass}`}>
                      <Icon
                        name={isCompleted ? 'check' : isRejected ? 'close' : st.icon}
                        size={18}
                      />
                    </div>

                    <div className={s.stepContent}>
                      <div className={s.stepTitleRow}>
                        <span className={`${s.stepName} ${isActive ? s.stepNameActive : ''}`}>
                          {st.title}
                        </span>
                        {index === 0 && (
                          <span className={s.stepTime}>{formatTimeAgo(selectedComplaint.created_at)}</span>
                        )}
                        {index === 3 && selectedComplaint.resolved_at && (
                          <span className={s.stepTime}>{formatDate(selectedComplaint.resolved_at)}</span>
                        )}
                      </div>

                      <p className={s.stepDesc}>{st.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Citizen Feedback Form (When Resolved) */}
          {selectedComplaint.status === 'RESOLVED' && !feedbackSubmitted && (
            <div className={s.feedbackCard}>
              <h4 className={s.feedbackTitle}>Rate Redressal Quality</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--cz-secondary-text, #64748b)' }}>
                Your complaint has been marked as resolved by the municipal department. Please rate your satisfaction.
              </p>

              <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: star <= rating ? '#e8a64a' : '#cbd5e1',
                        fontSize: 22,
                        padding: 2,
                      }}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginLeft: 6 }}>
                    {rating} / 5 Stars
                  </span>
                </div>

                <textarea
                  className={s.trackingInput}
                  rows={2}
                  style={{ fontFamily: 'inherit', fontWeight: 'normal', fontSize: 13.5 }}
                  placeholder="Optional feedback comments for municipal supervisor..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className={s.trackBtn}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Icon name="star" size={16} />
                  <span>{isSubmittingFeedback ? 'Submitting...' : 'Submit Citizen Rating'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackComplaint;
