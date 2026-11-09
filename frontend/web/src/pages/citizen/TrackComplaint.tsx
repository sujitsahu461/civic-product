import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useComplaintStore from '../../store/complaintStore';
import useAuthStore from '../../store/authStore';
import feedbackService from '../../services/feedback.service';
import { useToast } from '../../components/ui/Toast';
import Icon from '../../components/ui/Icon';
import { formatDate, formatTimeAgo } from '../../utils/formatters';
import s from './TrackComplaint.module.css';

export const TrackComplaint: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const { selectedComplaint, timeline, isLoading, error, trackComplaint, fetchTimeline } =
    useComplaintStore();
  const { error: toastError, success } = useToast();
  // Ratings require sign-in; the API also checks that this citizen filed the complaint.
  const { user, isAuthenticated } = useAuthStore();
  const canRate = isAuthenticated && user?.role === 'CITIZEN';

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
      if (!silent) toastError(t('track.noComplaintFound'));
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
      title: t('track.stepSubmitted'),
      desc: t('track.stepSubmittedDesc'),
      icon: 'receipt_long',
    },
    {
      title: t('track.stepAssigned'),
      desc: selectedComplaint?.assigned_authority_name
        ? `${t('track.stepAssignedDesc')} (${selectedComplaint.assigned_authority_name})`
        : t('track.stepAssignedDesc'),
      icon: 'badge',
    },
    {
      title: t('track.stepInProgress'),
      desc: selectedComplaint?.status === 'IN_PROGRESS'
        ? t('track.stepInProgressDesc')
        : t('track.stepAwaitingDesc'),
      icon: 'engineering',
    },
    {
      title: t('track.stepResolved'),
      desc: selectedComplaint?.resolution_notes
        ? selectedComplaint.resolution_notes
        : t('track.stepResolvedDesc'),
      icon: 'task_alt',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <span className={s.statusBadgeResolved}>{t('statuses.RESOLVED')}</span>;
      case 'IN_PROGRESS':
        return <span className={s.statusBadgeProgress}>{t('statuses.IN_PROGRESS')}</span>;
      case 'ASSIGNED':
        return <span className={s.statusBadgeProgress}>{t('statuses.ASSIGNED')}</span>;
      case 'PENDING':
        return <span className={s.statusBadgePending}>{t('statuses.PENDING')}</span>;
      case 'REJECTED':
        return <span className={s.statusBadgeRejected}>{t('statuses.REJECTED')}</span>;
      case 'CLOSED':
        return <span className={s.statusBadgeRejected}>{t('statuses.CLOSED')}</span>;
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
      success(t('track.feedbackThanks'));
      setFeedbackSubmitted(true);
    } catch (err: any) {
      toastError(err?.message || t('track.feedbackError'));
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Filter attachments by type
  const imageAttachments = [
    ...(selectedComplaint?.attachments?.filter((a) => a.attachment_type === 'IMAGE') || []),
    ...(selectedComplaint?.images?.map((img) => ({
      public_id: img.public_id || String(img.id),
      attachment_type: 'IMAGE' as const,
      attachment_url: img.image,
      file_name: 'Photo evidence',
      file_size: 0,
      uploaded_at: img.uploaded_at,
    })) || []),
  ];

  const audioAttachments =
    selectedComplaint?.attachments?.filter((a) => a.attachment_type === 'AUDIO') || [];

  const videoAttachments =
    selectedComplaint?.attachments?.filter((a) => a.attachment_type === 'VIDEO') || [];

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <h1 className={s.title}>{t('track.title')}</h1>
        <p className={s.subtitle}>{t('track.subtitle')}</p>
      </div>

      {/* Public Tracking Input Card */}
      <div className={s.searchCard}>
        <form onSubmit={handleSubmitSearch} className={s.searchForm}>
          <div className={s.inputWrap}>
            <Icon name="search" size={20} className={s.searchIcon} />
            <input
              type="text"
              className={s.trackingInput}
              placeholder={t('track.inputPlaceholder')}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              required
            />
          </div>

          <button type="submit" disabled={isLoading} className={s.trackBtn}>
            <Icon name="search" size={17} />
            <span>{isLoading ? t('common.loading') : t('track.trackBtn')}</span>
          </button>
        </form>
      </div>

      {/* Tracking Result View */}
      {selectedComplaint && (
        <div className={s.resultCard}>
          <div className={s.resultTop}>
            <div className={s.codeBox}>
              <span className={s.codeLabel}>{t('common.trackingCode')}</span>
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
              <span className={s.metaLabel}>{t('common.category')}</span>
              <span className={s.metaVal}>
                {t(`categories.${selectedComplaint.category}`) || selectedComplaint.category_display || selectedComplaint.category}
              </span>
            </div>

            <div className={s.metaItem}>
              <span className={s.metaLabel}>{t('submit.assignedDept')}</span>
              <span className={s.metaVal}>
                {selectedComplaint.department_name || 'Municipal Office'}
              </span>
            </div>

            <div className={s.metaItem}>
              <span className={s.metaLabel}>{t('common.priority')}</span>
              <span
                className={s.metaVal}
                style={{
                  color:
                    selectedComplaint.priority === 'HIGH' || selectedComplaint.priority === 'URGENT'
                      ? '#912018'
                      : selectedComplaint.priority === 'LOW'
                      ? '#5A4033'
                      : '#B93E0C',
                }}
              >
                {t(`priorities.${selectedComplaint.priority}`) || selectedComplaint.priority}
              </span>
            </div>

            <div className={s.metaItem}>
              <span className={s.metaLabel}>{t('common.created')}</span>
              <span className={s.metaVal}>{formatDate(selectedComplaint.created_at, i18n.language)}</span>
            </div>
          </div>

          {/* Evidence is only shared with the citizen who filed it and municipal staff */}
          {selectedComplaint.evidence_hidden && (
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--cz-secondary-text, #64748b)' }}>
              {t('track.evidenceHidden', 'Photos and recordings are visible only to the citizen who filed this complaint and municipal staff.')}{' '}
              {!isAuthenticated && (
                <Link to="/login/citizen" style={{ color: '#16a34a', fontWeight: 700 }}>
                  {t('track.signInToSeeEvidence', 'Sign in to see them')}
                </Link>
              )}
            </p>
          )}

          {/* Multimedia Evidence Section */}
          {(imageAttachments.length > 0 || audioAttachments.length > 0 || videoAttachments.length > 0) && (
            <div className={s.evidenceSection}>
              <h3 className={s.evidenceHeading}>
                <Icon name="attachment" size={20} />
                <span>{t('submit.evidenceSection')}</span>
              </h3>

              {/* Photos */}
              {imageAttachments.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    {t('submit.photosTitle')} ({imageAttachments.length})
                  </div>
                  <div className={s.photosGrid}>
                    {imageAttachments.map((img, i) => (
                      <a
                        key={img.public_id || i}
                        href={img.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t('track.viewPhoto')}
                      >
                        <img
                          src={img.attachment_url}
                          alt={`Evidence ${i + 1}`}
                          className={s.photoThumb}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio Recordings */}
              {audioAttachments.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    {t('submit.audioTitle')} ({audioAttachments.length})
                  </div>
                  {audioAttachments.map((audio, i) => (
                    <div key={audio.public_id || i} className={s.audioBlock}>
                      <div className={s.audioHeader}>
                        <Icon name="mic" size={16} />
                        <span>{audio.file_name || t('media.audioPlayback')}</span>
                        {audio.duration_seconds && (
                          <span className="text-gray-400 font-mono text-xs ml-auto">
                            {audio.duration_seconds}s
                          </span>
                        )}
                      </div>
                      <audio controls src={audio.attachment_url} className={s.audioPlayer} />
                    </div>
                  ))}
                </div>
              )}

              {/* Video Evidence */}
              {videoAttachments.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    {t('submit.videoTitle')} ({videoAttachments.length})
                  </div>
                  {videoAttachments.map((vid, i) => (
                    <div key={vid.public_id || i} className={s.videoBlock}>
                      <video controls src={vid.attachment_url} className={s.videoPlayer} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vertical Timeline */}
          <div className={s.timelineSection}>
            <h3 className={s.timelineTitle}>{t('track.timelineTitle')}</h3>

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
                          <span className={s.stepTime}>{formatTimeAgo(selectedComplaint.created_at, i18n.language)}</span>
                        )}
                        {index === 3 && selectedComplaint.resolved_at && (
                          <span className={s.stepTime}>{formatDate(selectedComplaint.resolved_at, i18n.language)}</span>
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
              <h4 className={s.feedbackTitle}>{t('track.rateTitle')}</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--cs-text-muted)' }}>
                {t('track.rateDesc')}
              </p>

              {!canRate ? (
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--cz-secondary-text, #64748b)' }}>
                  {t('track.signInToRate', 'Only the citizen who filed this complaint can rate it.')}{' '}
                  <Link to="/login/citizen" style={{ color: '#16a34a', fontWeight: 700 }}>
                    {t('track.signInToRateLink', 'Sign in to rate')}
                  </Link>
                </p>
              ) : (
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
                        color: star <= rating ? '#F4C430' : '#DCCDB5',
                        fontSize: 22,
                        padding: 2,
                      }}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3B2418', marginLeft: 6 }}>
                    {rating} / 5
                  </span>
                </div>

                <textarea
                  className={s.trackingInput}
                  rows={2}
                  style={{ fontFamily: 'inherit', fontWeight: 'normal', fontSize: 13.5 }}
                  placeholder={t('track.feedbackPlaceholder')}
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
                  <span>{isSubmittingFeedback ? t('common.submitting') : t('track.submitFeedback')}</span>
                </button>
              </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackComplaint;
