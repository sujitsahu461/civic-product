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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={s.inputLabel}>
                      {t('submit.categoryLabel')} <span className={s.req}>*</span>
                    </label>
                    <select
                      className={s.selectInput}
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as ComplaintCategory)}
                      required
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {t(`categories.${cat}`)}
                        </option>
                      ))}
                    </select>
                    <p className={s.helpText}>{t('submit.categoryHelp')}</p>
                  </div>

                  <div>
                    <label className={s.inputLabel}>
                      {t('submit.priorityLabel')} <span className={s.req}>*</span>
                    </label>
                    <select
                      className={s.selectInput}
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value as ComplaintPriority)}
                      required
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {t(`priorities.${p}`)}
                        </option>
                      ))}
                    </select>
                    <p className={s.helpText}>{t('submit.priorityHelp')}</p>
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

        {/* Right Column: Municipal Jurisdiction & Guidelines */}
        <div className={s.sidebarCol}>
          <div className={s.triageCard}>
            <div className={s.triageHeader}>
              <div className={s.triageTitleGroup}>
                <h4 className={s.triageTitle}>
                  <Icon name="account_balance" size={20} style={{ color: 'var(--cz-accent-blue, #5b9fcb)' }} />
                  <span>Municipal Jurisdiction</span>
                </h4>
                <p className={s.triageSubtitle}>
                  Transparent, deterministic routing to jurisdictional field engineers.
                </p>
              </div>
            </div>

            <div className={s.aiResultBox}>
              <div className={s.aiBadgeRow}>
                <span className={s.aiBadgeLabel}>{t('common.category')}</span>
                <span className={s.aiBadgeValue}>
                  {t(`categories.${selectedCategory}`)}
                </span>
              </div>

              <div className={s.aiBadgeRow}>
                <span className={s.aiBadgeLabel}>{t('submit.assignedDept')}</span>
                <span className={s.aiBadgeValue} style={{ color: 'var(--cz-accent-blue-dark, #2c6e97)' }}>
                  {t(currentDept.nameKey)}
                </span>
              </div>

              <div className={s.aiBadgeRow}>
                <span className={s.aiBadgeLabel}>{t('common.priority')}</span>
                <div>
                  <span
                    className={
                      selectedPriority === 'URGENT' || selectedPriority === 'HIGH'
                        ? s.badgePriorityHigh
                        : selectedPriority === 'LOW'
                        ? s.badgePriorityLow
                        : s.badgePriorityMedium
                    }
                  >
                    {t(`priorities.${selectedPriority}`)}
                  </span>
                </div>
              </div>

              <div className={s.aiBadgeRow}>
                <span className={s.aiBadgeLabel}>Estimated SLA</span>
                <span className={s.aiBadgeValue} style={{ fontSize: 12.5, color: 'var(--cz-secondary-text, #64748b)' }}>
                  {currentDept.defaultSla}
                </span>
              </div>
            </div>
          </div>

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
