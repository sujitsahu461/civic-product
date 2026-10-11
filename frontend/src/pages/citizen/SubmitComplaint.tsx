import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import { ComplaintCategory, ComplaintPriority } from '../../types/complaint';
import { useToast } from '../../components/ui/Toast';
import Icon from '../../components/ui/Icon';
import LocationPicker from '../../components/map/LocationPicker';
import AudioRecorder from '../../components/ui/AudioRecorder';
import { smartDetectGps, resolveAddressToCoords } from '../../config/mapConfig';
import s from './SubmitComplaint.module.css';

const DEPARTMENT_ROUTING: Record<string, { nameKey: string; defaultSla: string }> = {
  ROAD: { nameKey: 'categories.ROAD', defaultSla: '24-48 hours' },
  WATER: { nameKey: 'categories.WATER', defaultSla: '12-24 hours' },
  ELECTRICITY: { nameKey: 'categories.ELECTRICITY', defaultSla: '6-12 hours' },
  DRAINAGE: { nameKey: 'categories.DRAINAGE', defaultSla: '18-36 hours' },
  SANITATION: { nameKey: 'categories.SANITATION', defaultSla: '12-24 hours' },
  PARKS: { nameKey: 'categories.PARKS', defaultSla: '48-72 hours' },
  NOISE: { nameKey: 'categories.NOISE', defaultSla: '12-24 hours' },
  OTHER: { nameKey: 'categories.OTHER', defaultSla: '48 hours' },
};

const CATEGORIES: ComplaintCategory[] = [
  'ROAD',
  'WATER',
  'ELECTRICITY',
  'DRAINAGE',
  'SANITATION',
  'PARKS',
  'NOISE',
  'OTHER',
];

const PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const CATEGORY_METADATA: Record<ComplaintCategory, {
  icon: string;
  deptKey: string;
  defaultSla: string;
  color: string;
  bgLight: string;
  borderColor: string;
}> = {
  ROAD: { icon: 'add_road', deptKey: 'categories.ROAD', defaultSla: '24-48h', color: '#b45309', bgLight: '#fef3c7', borderColor: '#fde68a' },
  WATER: { icon: 'water_drop', deptKey: 'categories.WATER', defaultSla: '12-24h', color: '#0369a1', bgLight: '#e0f2fe', borderColor: '#bae6fd' },
  ELECTRICITY: { icon: 'electric_bolt', deptKey: 'categories.ELECTRICITY', defaultSla: '6-12h', color: '#b91c1c', bgLight: '#fee2e2', borderColor: '#fecaca' },
  DRAINAGE: { icon: 'waves', deptKey: 'categories.DRAINAGE', defaultSla: '18-36h', color: '#0f766e', bgLight: '#ccfbf1', borderColor: '#99f6e4' },
  SANITATION: { icon: 'delete_sweep', deptKey: 'categories.SANITATION', defaultSla: '12-24h', color: '#15803d', bgLight: '#dcfce7', borderColor: '#bbf7d0' },
  PARKS: { icon: 'park', deptKey: 'categories.PARKS', defaultSla: '48-72h', color: '#047857', bgLight: '#d1fae5', borderColor: '#a7f3d0' },
  NOISE: { icon: 'volume_up', deptKey: 'categories.NOISE', defaultSla: '12-24h', color: '#6d28d9', bgLight: '#ede9fe', borderColor: '#ddd6fe' },
  OTHER: { icon: 'domain', deptKey: 'categories.OTHER', defaultSla: '48h', color: '#475569', bgLight: '#f1f5f9', borderColor: '#e2e8f0' },
};

const PRIORITY_METADATA: Record<ComplaintPriority, {
  labelKey: string;
  sla: string;
  desc: string;
  icon: string;
  color: string;
  bgActive: string;
  borderActive: string;
}> = {
  LOW: { labelKey: 'priorities.LOW', sla: '72h', desc: 'Routine civic defect', icon: 'check_circle', color: '#16a34a', bgActive: '#f0fdf4', borderActive: '#86efac' },
  MEDIUM: { labelKey: 'priorities.MEDIUM', sla: '24-48h', desc: 'Standard neighborhood issue', icon: 'schedule', color: '#d97706', bgActive: '#fffbeb', borderActive: '#fde68a' },
  HIGH: { labelKey: 'priorities.HIGH', sla: '12-24h', desc: 'Active supply or traffic disruption', icon: 'warning', color: '#ea580c', bgActive: '#fff7ed', borderActive: '#fdba74' },
  URGENT: { labelKey: 'priorities.URGENT', sla: '6-12h', desc: 'Emergency hazard / safety threat', icon: 'error', color: '#dc2626', bgActive: '#fef2f2', borderActive: '#fca5a5' },
};

export const SubmitComplaint: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { submitComplaint } = useComplaintStore();
  const { success, error: toastError } = useToast();

  // Basic Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory>('ROAD');
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority>('MEDIUM');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Multimedia Attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // UI / Status State
  const [geoLoading, setGeoLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Live Filing Readiness Score
  const readiness = useMemo(() => {
    let score = 0;
    const checks = {
      category: !!selectedCategory,
      details: !!(title.trim().length >= 5 && description.trim().length >= 10),
      location: !!(address.trim() || (latitude && longitude)),
      media: selectedFiles.length > 0 || !!audioFile || !!videoFile,
    };
    if (checks.category) score += 30;
    if (checks.details) score += 30;
    if (checks.location) score += 25;
    if (checks.media) score += 15;
    return { score: Math.min(score, 100), checks };
  }, [selectedCategory, title, description, address, latitude, longitude, selectedFiles.length, audioFile, videoFile]);

  // Success Modal State
  const [submittedData, setSubmittedData] = useState<{
    tracking_code: string;
    department_name: string;
    status: string;
  } | null>(null);

  const userWardName = useMemo(() => {
    if (!user?.address) return 'Central Ward';
    const addr = user.address.trim();
    if (addr.toLowerCase().includes('modip')) return 'Modipara';
    if (addr.toLowerCase().includes('sakhip')) return 'Sakhipara';
    if (addr.toLowerCase().includes('budharaj')) return 'Budharaja';
    if (addr.toLowerCase().includes('dhanupal')) return 'Dhanupali';
    if (addr.toLowerCase().includes('gunupur') || addr.toLowerCase().includes('giet')) return 'GIET Gunupur';
    if (addr.length > 20) return addr.slice(0, 18) + '...';
    return addr;
  }, [user?.address]);

  const handleUseMyWard = async () => {
    setGeoLoading(true);
    try {
      const res = await resolveAddressToCoords(user?.address || 'Modipara, Sambalpur');
      setLatitude(res.lat);
      setLongitude(res.lng);
      setAddress(res.address);
      success(`Applied registered ward: ${res.name}`);
    } catch {
      toastError('Could not resolve ward location.');
    } finally {
      setGeoLoading(false);
    }
  };

  const handleLocationDetect = async () => {
    setGeoLoading(true);
    try {
      const res = await smartDetectGps(user?.address);
      setLatitude(res.lat);
      setLongitude(res.lng);
      setAddress(res.address);
      success(res.message);
    } catch {
      await handleUseMyWard();
    } finally {
      setGeoLoading(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (selectedFiles.length + files.length > 5) {
      toastError(t('media.fileSizeExceeded') || 'Maximum 5 photos allowed.');
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toastError(`File "${file.name}" exceeds 5MB limit.`);
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toastError('Video file exceeds 25MB limit.');
      return;
    }

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!allowedTypes.some((t) => file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm'))) {
      toastError(t('media.fileTypeUnsupported') || 'Unsupported video format. Please upload MP4 or WebM.');
      return;
    }

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(null);
    setVideoPreviewUrl(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || title.trim().length < 5) {
      setFormError('Please enter a descriptive complaint title (at least 5 characters).');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setFormError('Please describe the issue in detail (at least 10 characters).');
      return;
    }

    if (!address.trim() || address.trim().length < 3) {
      setFormError('Please provide a specific street address or landmark.');
      return;
    }

    setIsSubmitting(true);

    const cleanLat = latitude != null && !isNaN(Number(latitude)) ? parseFloat(Number(latitude).toFixed(6)) : null;
    const cleanLng = longitude != null && !isNaN(Number(longitude)) ? parseFloat(Number(longitude).toFixed(6)) : null;

    try {
      const created = await submitComplaint({
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        priority: selectedPriority,
        location_address: address.trim(),
        latitude: cleanLat,
        longitude: cleanLng,
        images: selectedFiles,
        audio: audioFile || undefined,
        video: videoFile || undefined,
        audio_duration: audioDuration > 0 ? audioDuration : undefined,
      });

      const deptName =
        created.department_name ||
        t(DEPARTMENT_ROUTING[created.category || selectedCategory]?.nameKey || 'categories.ROAD');

      setSubmittedData({
        tracking_code: created.tracking_code,
        department_name: deptName,
        status: created.status || 'PENDING',
      });
      success(`Grievance filed successfully! Tracking Code: ${created.tracking_code}`);
    } catch (err: any) {
      const msg = err.message || 'Failed to submit grievance. Please verify all fields.';
      setFormError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDept = DEPARTMENT_ROUTING[selectedCategory] || DEPARTMENT_ROUTING.OTHER;

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.pageHeader}>
        <h1 className={s.title}>{t('submit.pageTitle')}</h1>
        <p className={s.subtitle}>{t('submit.pageSubtitle')}</p>
      </div>

      {!isAuthenticated && (
        <div className={s.anonNoticeBanner}>
          <div className={s.anonBadge}>
            <Icon name="visibility_off" size={17} />
            <span>{t('submit.anonymousBannerTitle')}</span>
          </div>
          <p className={s.anonNoticeText}>
            {t('submit.anonymousBannerDesc')}
          </p>
        </div>
      )}

      <div className={s.formGrid}>
        {/* Left Column: Form */}
        <div className={s.formCard}>
          {formError && (
            <div className={s.errorBanner}>
              <Icon name="error" size={18} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={s.form}>
            {/* Step 1: Grievance Details */}
            <div className={s.section}>
              <h3 className={s.sectionHeading}>
                <span className={s.stepNum}>1</span>
                <span>{t('submit.descLabel')}</span>
              </h3>

              <div className={s.fieldGroup}>
                <div>
                  <label className={s.inputLabel}>
                    {t('submit.titleLabel')} <span className={s.req}>*</span>
                  </label>
                  <input
                    type="text"
                    className={s.textInput}
                    placeholder={t('submit.titlePlaceholder')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    required
                  />
                </div>

                {/* Interactive Category Selector Grid */}
                <div>
                  <div className={s.categorySectionHeader}>
                    <label className={s.inputLabel}>
                      {t('submit.categoryLabel')} <span className={s.req}>*</span>
                    </label>
                    <span className="text-xs text-gray-500 font-medium">
                      {t('submit.assignedDept')}: <strong className="text-blue-600 font-bold">{t(currentDept.nameKey)}</strong> ({currentDept.defaultSla})
                    </span>
                  </div>
                  <div className={s.categoryGrid}>
                    {CATEGORIES.map((cat) => {
                      const meta = CATEGORY_METADATA[cat];
                      const isSelected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`${s.categoryCard} ${isSelected ? s.categoryCardActive : ''}`}
                          aria-pressed={isSelected}
                        >
                          <div className={s.categoryCardTop}>
                            <div
                              className={s.categoryIconWrap}
                              style={{
                                backgroundColor: isSelected ? meta.bgLight : '#f8fafc',
                                color: isSelected ? meta.color : '#64748b',
                              }}
                            >
                              <Icon name={meta.icon} size={20} />
                            </div>
                            {isSelected && (
                              <span className={s.categoryCheck}>
                                <Icon name="check_circle" size={18} />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className={s.categoryTitle}>{t(`categories.${cat}`)}</div>
                          </div>
                          <div className={s.categoryCardFooter}>
                            <span className={s.categorySlaBadge}>
                              {meta.defaultSla} SLA
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Priority Selector Pills */}
                <div>
                  <label className={s.inputLabel}>
                    {t('submit.priorityLabel')} <span className={s.req}>*</span>
                  </label>
                  <div className={s.priorityGrid}>
                    {PRIORITIES.map((p) => {
                      const meta = PRIORITY_METADATA[p];
                      const isSelected = selectedPriority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSelectedPriority(p)}
                          className={`${s.priorityCard} ${isSelected ? s.priorityCardActive : ''}`}
                          style={{
                            backgroundColor: isSelected ? meta.bgActive : '#ffffff',
                            borderColor: isSelected ? meta.borderActive : undefined,
                          }}
                          aria-pressed={isSelected}
                        >
                          <div className={s.priorityCardHeader}>
                            <span className={s.priorityCardTitle} style={{ color: meta.color }}>
                              <Icon name={meta.icon} size={16} />
                              <span>{t(meta.labelKey)}</span>
                            </span>
                            <span className={s.priorityCardSla}>{meta.sla}</span>
                          </div>
                          <span className={s.priorityCardDesc}>{meta.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={s.inputLabel}>
                    {t('submit.descLabel')} <span className={s.req}>*</span>
                  </label>
                  <textarea
                    className={s.textarea}
                    rows={4}
                    placeholder={t('submit.descPlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={3000}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Location */}
            <div className={s.section}>
              <div className={s.locationHeaderRow}>
                <h3 className={s.sectionHeading}>
                  <span className={s.stepNum}>2</span>
                  <span>{t('submit.locationSection')}</span>
                </h3>

                <div className={s.locationActionGroup}>
                  <button
                    type="button"
                    onClick={handleUseMyWard}
                    disabled={geoLoading}
                    className={`${s.locBtn} ${s.locBtnOrange}`}
                    title={`Apply registered ward: ${user?.address || 'Central Ward'}`}
                  >
                    <Icon name="home_pin" size={15} />
                    <span>{t('submit.useMyWardBtn')} ({userWardName})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLocationDetect}
                    disabled={geoLoading}
                    className={`${s.locBtn} ${s.locBtnBlue}`}
                  >
                    <Icon name={geoLoading ? 'hourglass_top' : 'my_location'} size={15} />
                    <span>{geoLoading ? t('common.loading') : t('submit.detectGpsBtn')}</span>
                  </button>
                </div>
              </div>

              <div className={s.fieldGroup}>
                <LocationPicker
                  initialLat={latitude}
                  initialLng={longitude}
                  onLocationSelect={(lat, lng, addr) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    if (addr) setAddress(addr);
                  }}
                  height="240px"
                />

                <div>
                  <label className={s.inputLabel}>
                    {t('submit.addressLabel')} <span className={s.req}>*</span>
                  </label>
                  <input
                    type="text"
                    className={s.textInput}
                    placeholder={t('submit.addressPlaceholder')}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                <div className={s.coordsRow}>
                  <div>
                    <label className={s.inputLabel}>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className={s.textInput}
                      placeholder="e.g. 21.466872"
                      value={latitude ?? ''}
                      onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div>
                    <label className={s.inputLabel}>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className={s.textInput}
                      placeholder="e.g. 83.981165"
                      value={longitude ?? ''}
                      onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Multimedia Evidence Section */}
            <div className={s.section}>
              <h3 className={s.sectionHeading}>
                <span className={s.stepNum}>3</span>
                <span>{t('submit.evidenceSection')}</span>
              </h3>

              {/* 3A: Audio Voice Evidence */}
              <div className="mb-5">
                <AudioRecorder
                  onAudioChange={(file, duration) => {
                    setAudioFile(file);
                    setAudioDuration(duration);
                  }}
                />
              </div>

              {/* 3B: Photo Evidence */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  {t('submit.photosTitle')}
                </label>
                <div className={s.uploadDropArea}>
                  <input
                    type="file"
                    id="fileUpload"
                    multiple
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className={s.fileInput}
                  />
                  <div className={s.uploadIcon}>
                    <Icon name="add_a_photo" size={26} />
                  </div>
                  <h4 className={s.uploadTitle}>{t('submit.selectPhotosBtn')}</h4>
                  <p className={s.uploadSub}>{t('submit.photosHelp')}</p>
                </div>

                {previewUrls.length > 0 && (
                  <div className={s.previewGrid}>
                    {previewUrls.map((url, i) => (
                      <div key={url} className={s.previewItem}>
                        <img src={url} alt={`Photo ${i + 1}`} className={s.previewImg} />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(i)}
                          className={s.removeImgBtn}
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3C: Video Evidence */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  {t('submit.videoTitle')}
                </label>
                {!videoPreviewUrl ? (
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl cursor-pointer bg-gray-50/60 hover:bg-emerald-50/20 transition-all text-center"
                  >
                    <input
                      type="file"
                      ref={videoInputRef}
                      accept="video/mp4,video/webm,video/*"
                      onChange={handleVideoFileChange}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                      <Icon name="videocam" size={22} />
                    </div>
                    <div className="text-xs font-bold text-gray-800">{t('submit.selectVideoBtn')}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{t('submit.videoHelp')}</div>
                  </div>
                ) : (
                  <div className={s.videoContainer}>
                    <video
                      controls
                      src={videoPreviewUrl}
                      className={s.videoPlayer}
                    />
                    <div className={s.videoFooter}>
                      <span className="truncate max-w-[200px]">
                        {videoFile?.name || 'On-site video evidence'}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className={s.removeVideoBtn}
                      >
                        {t('submit.removeVideoBtn')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={s.submitBtn}
            >
              <Icon name="send" size={18} />
              <span>{isSubmitting ? t('common.submitting') : t('submit.submitBtn')}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Interactive Live Grievance Dossier & Helplines */}
        <div className={s.sidebarCol}>
          {/* Interactive Live Grievance Ticket Preview Card */}
          <div className={s.previewCard}>
            <div className={s.previewHeader}>
              <div className={s.previewTitleGroup}>
                <h4 className={s.previewTitle}>
                  <Icon name="assignment" size={20} style={{ color: 'var(--cz-accent-blue, #5b9fcb)' }} />
                  <span>{t('submit.livePreviewTitle')}</span>
                </h4>
              </div>
              <span
                className={`${s.previewStatusBadge} ${
                  readiness.score >= 85 ? s.statusReady : s.statusDraft
                }`}
              >
                <Icon name={readiness.score >= 85 ? 'task_alt' : 'edit_note'} size={14} />
                <span>
                  {readiness.score >= 85
                    ? t('submit.readyToSubmit')
                    : t('submit.drafting')}
                </span>
              </span>
            </div>

            {/* Readiness Progress Meter */}
            <div className={s.readinessBox}>
              <div className={s.readinessRow}>
                <span>{t('submit.readinessLabel')}</span>
                <span className={s.readinessPercent}>{readiness.score}%</span>
              </div>
              <div className={s.readinessTrack}>
                <div
                  className={s.readinessFill}
                  style={{
                    width: `${readiness.score}%`,
                    backgroundColor:
                      readiness.score >= 85
                        ? '#16a34a'
                        : readiness.score >= 50
                        ? '#d97706'
                        : '#3b82f6',
                  }}
                />
              </div>
            </div>

            {/* Interactive Step Completion Checklist */}
            <div className={s.checklistGrid}>
              <div
                className={`${s.checklistItem} ${
                  readiness.checks.category ? s.checklistItemCompleted : ''
                }`}
              >
                <Icon
                  name={readiness.checks.category ? 'check_circle' : 'radio_button_unchecked'}
                  size={14}
                />
                <span>Category</span>
              </div>
              <div
                className={`${s.checklistItem} ${
                  readiness.checks.details ? s.checklistItemCompleted : ''
                }`}
              >
                <Icon
                  name={readiness.checks.details ? 'check_circle' : 'radio_button_unchecked'}
                  size={14}
                />
                <span>Details</span>
              </div>
              <div
                className={`${s.checklistItem} ${
                  readiness.checks.location ? s.checklistItemCompleted : ''
                }`}
              >
                <Icon
                  name={readiness.checks.location ? 'check_circle' : 'radio_button_unchecked'}
                  size={14}
                />
                <span>Location</span>
              </div>
              <div
                className={`${s.checklistItem} ${
                  readiness.checks.media ? s.checklistItemCompleted : ''
                }`}
              >
                <Icon
                  name={readiness.checks.media ? 'check_circle' : 'radio_button_unchecked'}
                  size={14}
                />
                <span>Evidence ({selectedFiles.length + (audioFile ? 1 : 0) + (videoFile ? 1 : 0)})</span>
              </div>
            </div>

            {/* Live Interactive Ticket Frame */}
            <div className={s.liveTicketBox}>
              <div className={s.ticketTopRow}>
                <span
                  className={s.ticketCategoryPill}
                  style={{
                    backgroundColor: CATEGORY_METADATA[selectedCategory].bgLight,
                    color: CATEGORY_METADATA[selectedCategory].color,
                  }}
                >
                  <Icon name={CATEGORY_METADATA[selectedCategory].icon} size={14} />
                  <span>{t(`categories.${selectedCategory}`)}</span>
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: PRIORITY_METADATA[selectedPriority].color,
                  }}
                >
                  {t(PRIORITY_METADATA[selectedPriority].labelKey)}
                </span>
              </div>

              <div>
                <h5 className={`${s.ticketTitle} ${!title.trim() ? s.ticketTitlePlaceholder : ''}`}>
                  {title.trim() || t('submit.previewPlaceholder')}
                </h5>
                {description.trim() && (
                  <p className={s.ticketDesc}>
                    {description.slice(0, 110)}
                    {description.length > 110 ? '...' : ''}
                  </p>
                )}
              </div>

              <div className={s.ticketMetaRow}>
                <div className={s.ticketMetaItem}>
                  <Icon name="location_on" size={14} style={{ color: '#2563eb' }} />
                  <span>
                    {address.trim()
                      ? address.length > 36
                        ? address.slice(0, 34) + '...'
                        : address
                      : t('submit.previewLocationPending')}
                  </span>
                </div>
                <div className={s.ticketMetaItem}>
                  <Icon name="business" size={14} style={{ color: '#475569' }} />
                  <span>
                    {t(currentDept.nameKey)} • {currentDept.defaultSla} SLA
                  </span>
                </div>

                {/* Evidence Badges */}
                <div className={s.evidenceChips}>
                  {audioFile && (
                    <span className={s.evidenceChip}>
                      <Icon name="mic" size={12} />
                      <span>{audioDuration ? `${audioDuration}s Voice` : 'Voice Note'}</span>
                    </span>
                  )}
                  {selectedFiles.length > 0 && (
                    <span className={s.evidenceChip}>
                      <Icon name="photo_camera" size={12} />
                      <span>{selectedFiles.length} Photo{selectedFiles.length > 1 ? 's' : ''}</span>
                    </span>
                  )}
                  {videoFile && (
                    <span className={s.evidenceChip}>
                      <Icon name="videocam" size={12} />
                      <span>1 Video</span>
                    </span>
                  )}
                  {!audioFile && selectedFiles.length === 0 && !videoFile && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      No media evidence attached yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Municipal Helplines Card */}
          <div className={s.helplineCard}>
            <h4 className={s.helplineTitle}>
              <Icon name="phone_in_talk" size={18} style={{ color: '#2563eb' }} />
              <span>{t('submit.emergencyHelplines')}</span>
            </h4>
            <div className={s.helplineList}>
              <div className={s.helplineRow}>
                <span className={s.helplineLabel}>
                  <Icon name="support_agent" size={16} />
                  <span>{t('submit.controlRoom')}</span>
                </span>
                <a href="tel:18003457788" className={s.helplineNumber}>1800-345-7788</a>
              </div>
              <div className={s.helplineRow}>
                <span className={s.helplineLabel}>
                  <Icon name="bolt" size={16} />
                  <span>{t('submit.electricityHelpline')}</span>
                </span>
                <a href="tel:1912" className={s.helplineNumber}>1912</a>
              </div>
              <div className={s.helplineRow}>
                <span className={s.helplineLabel}>
                  <Icon name="water" size={16} />
                  <span>{t('submit.waterHelpline')}</span>
                </span>
                <a href="tel:06632400123" className={s.helplineNumber}>0663-2400123</a>
              </div>
            </div>
          </div>

          {/* Filing Guidelines Card */}

          {/* Filing Guidelines Card */}
          <div className={s.guidelinesCard}>
            <h4 className={s.guidelinesTitle}>Filing Guidelines</h4>
            <ul className={s.guideList}>
              <li>Select the municipal category matching your issue for direct jurisdictional dispatch.</li>
              <li>Include prominent landmarks, street names, or ward numbers.</li>
              <li>Voice recordings allow instant reporting in your native language.</li>
              <li>Upload photos and video clips to prove physical ground severity.</li>
              <li>Use the generated Tracking Code anytime to track inspection and repairs.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ================= COMPLAINT SUCCESS SCREEN / MODAL ================= */}
      {submittedData && (
        <div className={s.successOverlay}>
          <div className={s.successCard}>
            <div className={s.successCheckIcon}>
              <Icon name="check" size={32} />
            </div>

            <h3 className={s.successTitle}>{t('submit.successModalTitle')}</h3>
            <p className={s.successMsg}>
              {t('submit.successModalSubtitle')}
            </p>

            <div className={s.trackingBox}>
              <span className={s.trackingBoxLabel}>{t('common.trackingCode')}</span>
              <span className={s.trackingBoxCode}>{submittedData.tracking_code}</span>
            </div>

            <div className={s.successDetailsRow}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--cz-secondary-text, #64748b)', display: 'block' }}>{t('common.status')}</span>
                <span className={s.badgePriorityMedium} style={{ display: 'inline-block', marginTop: 4 }}>
                  {t(`statuses.${submittedData.status}`) || submittedData.status}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--cz-secondary-text, #64748b)', display: 'block' }}>{t('submit.assignedDept')}</span>
                <strong style={{ fontSize: 13, color: '#0f172a', display: 'inline-block', marginTop: 4 }}>
                  {submittedData.department_name}
                </strong>
              </div>
            </div>

            <div className={s.successActions}>
              <Link
                to={`/citizen/tracking?code=${submittedData.tracking_code}`}
                className={s.successBtnTrack}
              >
                <Icon name="search" size={16} />
                <span>{t('submit.trackNowBtn')}</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmittedData(null);
                  setTitle('');
                  setDescription('');
                  setAddress('');
                  setSelectedFiles([]);
                  setPreviewUrls([]);
                  setAudioFile(null);
                  setVideoFile(null);
                  setVideoPreviewUrl(null);
                }}
                className={s.successBtnList}
              >
                <Icon name="add" size={16} />
                <span>{t('submit.fileAnotherBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitComplaint;
