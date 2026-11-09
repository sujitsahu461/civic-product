import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import { ComplaintCategory, ComplaintPriority } from '../../types/complaint';
import { useToast } from '../../components/ui/Toast';
import Icon from '../../components/ui/Icon';
import LocationPicker from '../../components/map/LocationPicker';
import AudioRecorder from '../../components/ui/AudioRecorder';
import s from './SubmitComplaint.module.css';

// SLA values are hour ranges; the "hours" wording comes from the locale files.
const DEPARTMENT_ROUTING: Record<string, { nameKey: string; defaultSla: string }> = {
  ROAD: { nameKey: 'categories.ROAD', defaultSla: '24-48' },
  WATER: { nameKey: 'categories.WATER', defaultSla: '12-24' },
  ELECTRICITY: { nameKey: 'categories.ELECTRICITY', defaultSla: '6-12' },
  DRAINAGE: { nameKey: 'categories.DRAINAGE', defaultSla: '18-36' },
  SANITATION: { nameKey: 'categories.SANITATION', defaultSla: '12-24' },
  PARKS: { nameKey: 'categories.PARKS', defaultSla: '48-72' },
  NOISE: { nameKey: 'categories.NOISE', defaultSla: '12-24' },
  OTHER: { nameKey: 'categories.OTHER', defaultSla: '48' },
};

// The categories this form offers. The backend also has GARBAGE and STREET_LIGHT; here they are
// filed under SANITATION ("Sanitation & Solid Waste") and ELECTRICITY ("Electricity & Street Lights").
type FormCategory = Exclude<ComplaintCategory, 'GARBAGE' | 'STREET_LIGHT'>;

const CATEGORIES: FormCategory[] = [
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

const CATEGORY_METADATA: Record<FormCategory, {
  icon: string;
  deptKey: string;
  defaultSla: string;
  color: string;
  bgLight: string;
  borderColor: string;
}> = {
  ROAD: { icon: 'add_road', deptKey: 'categories.ROAD', defaultSla: '24-48', color: '#6B4E00', bgLight: '#FDF0C4', borderColor: '#F6DC85' },
  WATER: { icon: 'water_drop', deptKey: 'categories.WATER', defaultSla: '12-24', color: '#B93E0C', bgLight: '#FFE8D6', borderColor: '#FFC9A3' },
  ELECTRICITY: { icon: 'electric_bolt', deptKey: 'categories.ELECTRICITY', defaultSla: '6-12', color: '#912018', bgLight: '#FDECEA', borderColor: '#F5C2BC' },
  DRAINAGE: { icon: 'waves', deptKey: 'categories.DRAINAGE', defaultSla: '18-36', color: '#5A4033', bgLight: '#F3EEE8', borderColor: '#E3D8CB' },
  SANITATION: { icon: 'delete_sweep', deptKey: 'categories.SANITATION', defaultSla: '12-24', color: '#1F6B3F', bgLight: '#E6F4EA', borderColor: '#B7DEC3' },
  PARKS: { icon: 'park', deptKey: 'categories.PARKS', defaultSla: '48-72', color: '#1F6B3F', bgLight: '#E6F4EA', borderColor: '#B7DEC3' },
  NOISE: { icon: 'volume_up', deptKey: 'categories.NOISE', defaultSla: '12-24', color: '#7A1F2B', bgLight: '#F6E3E5', borderColor: '#E4BCC1' },
  OTHER: { icon: 'domain', deptKey: 'categories.OTHER', defaultSla: '48', color: '#7D6657', bgLight: '#F7EFE1', borderColor: '#EADFCB' },
};

const PRIORITY_METADATA: Record<ComplaintPriority, {
  labelKey: string;
  sla: string;
  icon: string;
  color: string;
  bgActive: string;
  borderActive: string;
}> = {
  LOW: { labelKey: 'priorities.LOW', sla: '72', icon: 'check_circle', color: '#2E7D4F', bgActive: '#E6F4EA', borderActive: '#B7DEC3' },
  MEDIUM: { labelKey: 'priorities.MEDIUM', sla: '24-48', icon: 'schedule', color: '#6B4E00', bgActive: '#FDF0C4', borderActive: '#F6DC85' },
  HIGH: { labelKey: 'priorities.HIGH', sla: '12-24', icon: 'warning', color: '#B93E0C', bgActive: '#FFE8D6', borderActive: '#FFC9A3' },
  URGENT: { labelKey: 'priorities.URGENT', sla: '6-12', icon: 'error', color: '#B42318', bgActive: '#FDECEA', borderActive: '#F5C2BC' },
};

// The guided flow: one focused screen at a time.
const STEPS = ['what', 'where', 'proof', 'review'] as const;
// A contextual tip for each step (reuses the filing guidelines).
const STEP_TIPS = ['submit.guidelines.g1', 'submit.guidelines.g2', 'submit.guidelines.g4', 'submit.guidelines.g5'];

type FieldErrors = { title?: string; description?: string; address?: string };

// The "registered" pop-up closes itself after this long (paused while hovered/focused).
const SUCCESS_AUTO_CLOSE_MS = 8000;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const SubmitComplaint: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { submitComplaint } = useComplaintStore();
  const { success, error: toastError } = useToast();

  // Basic Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FormCategory>('ROAD');
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
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Step flow
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);

  // UI / Status State
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
  // After the pop-up closes, keep the tracking code on the page in a slim banner
  const [lastFiled, setLastFiled] = useState<{ tracking_code: string } | null>(null);

  // The map lives in a step that starts hidden; nudge Leaflet to re-measure when it shows.
  useEffect(() => {
    if (step !== 1) return undefined;
    const id = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    return () => window.clearTimeout(id);
  }, [step]);

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
        toastError(t('submit.photoTooLarge', { name: file.name }));
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
      toastError(t('submit.videoTooLarge'));
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

  // ---------- Step validation and navigation ----------
  const errorsForStep = (i: number): FieldErrors => {
    const errs: FieldErrors = {};
    if (i === 0) {
      if (title.trim().length < 5) errs.title = t('submit.errTitle');
      if (description.trim().length < 10) errs.description = t('submit.errDesc');
    }
    if (i === 1 && address.trim().length < 3) errs.address = t('submit.errAddress');
    return errs;
  };

  const showStep = (i: number) => {
    setStep(i);
    setMaxStepReached((m) => Math.max(m, i));
    setFormError('');
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      headingRefs.current[i]?.focus({ preventScroll: true });
    });
  };

  // Moving forward checks every step on the way; moving back never blocks.
  const goToStep = (target: number) => {
    if (target <= step) {
      showStep(target);
      return;
    }
    for (let i = step; i < target; i += 1) {
      const errs = errorsForStep(i);
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        if (i !== step) showStep(i);
        return;
      }
    }
    setFieldErrors({});
    showStep(target);
  };

  const clearFieldError = (key: keyof FieldErrors) => {
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async () => {
    setFormError('');
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
      success(t('submit.successToast', { code: created.tracking_code }));
    } catch (err: any) {
      const msg = err.message || t('submit.errSubmit');
      setFormError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enter / the main button: continue on steps 1-3, submit on the review step.
  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (step < STEPS.length - 1) {
      goToStep(step + 1);
      return;
    }
    for (const i of [0, 1]) {
      const errs = errorsForStep(i);
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        showStep(i);
        return;
      }
    }
    handleSubmit();
  };

  const resetForm = () => {
    setSubmittedData(null);
    setTitle('');
    setDescription('');
    setAddress('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    setAudioFile(null);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setFieldErrors({});
    setStep(0);
    setMaxStepReached(0);
  };

  // Close the success pop-up: remember the code for the banner and start a fresh,
  // empty form so the same report can't be sent twice.
  const closeSuccess = () => {
    if (submittedData) setLastFiled({ tracking_code: submittedData.tracking_code });
    resetForm();
  };

  // Esc closes the pop-up
  useEffect(() => {
    if (!submittedData) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSuccess();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submittedData]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      success(t('submit.wizard.copied'));
    } catch {
      // Clipboard blocked (e.g. insecure context): the code stays visible to copy by hand
    }
  };

  const currentDept = DEPARTMENT_ROUTING[selectedCategory] || DEPARTMENT_ROUTING.OTHER;
  const catMeta = CATEGORY_METADATA[selectedCategory];
  const priMeta = PRIORITY_METADATA[selectedPriority];
  const routeText = t('submit.wizard.routesTo', { dept: t(currentDept.nameKey), range: currentDept.defaultSla });

  const proofParts = [
    selectedFiles.length > 0 ? t('submit.chips.photos', { count: selectedFiles.length }) : null,
    audioFile ? (audioDuration ? t('submit.chips.voiceSeconds', { n: audioDuration }) : t('submit.chips.voiceNote')) : null,
    videoFile ? t('submit.chips.video') : null,
  ].filter(Boolean) as string[];

  const isLast = step === STEPS.length - 1;
  const nextLabel = isLast
    ? isSubmitting
      ? t('common.submitting')
      : t('submit.wizard.submit')
    : step === STEPS.length - 2
    ? t('submit.wizard.reviewBtn')
    : t('submit.wizard.continue');

  const headingRef = (i: number) => (el: HTMLHeadingElement | null) => {
    headingRefs.current[i] = el;
  };

  return (
    <div className={s.container}>
      <header className={s.pageHeader}>
        <h1 className={s.title}>{t('submit.pageTitle')}</h1>
        <p className={s.subtitle}>{t('submit.pageSubtitle')}</p>
      </header>

      {!isAuthenticated && (
        <div className={s.anonNotice} role="note">
          <Icon name="visibility_off" size={18} />
          <p>
            <strong>{t('submit.anonymousBannerTitle')}</strong> {t('submit.anonymousBannerDesc')}
          </p>
        </div>
      )}

      {/* After the success pop-up closes, the tracking code stays here */}
      {lastFiled && !submittedData && (
        <div className={s.filedBanner} role="status">
          <Icon name="task_alt" size={20} className={s.filedIcon} />
          <p className={s.filedText}>
            {t('submit.wizard.filedBanner')} <strong className={s.filedCode}>{lastFiled.tracking_code}</strong>
          </p>
          <div className={s.filedActions}>
            <button type="button" className={s.filedBtn} onClick={() => copyCode(lastFiled.tracking_code)}>
              <Icon name="content_copy" size={15} />
              <span>{t('submit.wizard.copy')}</span>
            </button>
            <Link to={`/citizen/tracking?code=${lastFiled.tracking_code}`} className={s.filedBtn}>
              <Icon name="search" size={15} />
              <span>{t('submit.trackNowBtn')}</span>
            </Link>
            <button
              type="button"
              className={s.filedClose}
              onClick={() => setLastFiled(null)}
              aria-label={t('submit.wizard.close')}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}

      <div className={s.layout}>
        {/* ================= GUIDED FORM ================= */}
        <div className={s.wizardCard} ref={cardRef}>
          {/* Stepper */}
          <nav className={s.stepperWrap} aria-label={t('submit.pageTitle')}>
            <ol className={s.stepper}>
              {STEPS.map((key, i) => {
                const isCurrent = i === step;
                const isDone = !isCurrent && i <= maxStepReached && i < STEPS.length - 1 && (i < step || Object.keys(errorsForStep(i)).length === 0);
                return (
                  <li key={key} className={`${s.stepItem} ${isCurrent ? s.stepCurrent : ''} ${isDone ? s.stepDone : ''}`}>
                    <button
                      type="button"
                      className={s.stepBtn}
                      onClick={() => goToStep(i)}
                      disabled={i > maxStepReached + 1 || (i > maxStepReached && i !== step + 1)}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      <span className={s.stepDot}>{isDone ? <Icon name="check" size={14} /> : i + 1}</span>
                      <span className={s.stepLabel}>{t(`submit.wizard.steps.${key}`)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className={s.progressTrack} aria-hidden="true">
              <div className={s.progressFill} style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
            </div>
          </nav>

          <form onSubmit={onFormSubmit} className={s.form} noValidate>
            {/* ---------- STEP 1: WHAT ---------- */}
            <section className={s.panel} hidden={step !== 0} aria-labelledby="cs-step-what">
              <header className={s.panelHead}>
                <h2 id="cs-step-what" className={s.panelTitle} tabIndex={-1} ref={headingRef(0)}>
                  {t('submit.wizard.whatTitle')}
                </h2>
                <p className={s.panelHint}>{t('submit.wizard.whatHint')}</p>
              </header>

              <div className={s.categoryGrid} role="radiogroup" aria-label={t('submit.categoryLabel')}>
                {CATEGORIES.map((cat) => {
                  const meta = CATEGORY_METADATA[cat];
                  const on = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`${s.catTile} ${on ? s.catTileOn : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <span className={s.catIcon} style={{ color: meta.color, backgroundColor: meta.bgLight }}>
                        <Icon name={meta.icon} size={20} />
                      </span>
                      <span className={s.catLabel}>{t(`categories.${cat}`)}</span>
                      {on && (
                        <span className={s.catCheck} aria-hidden="true">
                          <Icon name="check" size={13} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className={s.routeLine}>
                <Icon name="alt_route" size={16} />
                <span>{routeText}</span>
              </p>

              <div className={s.field}>
                <label htmlFor="cs-title" className={s.label}>{t('submit.titleLabel')}</label>
                <input
                  id="cs-title"
                  type="text"
                  className={`${s.input} ${fieldErrors.title ? s.inputError : ''}`}
                  placeholder={t('submit.titlePlaceholder')}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    clearFieldError('title');
                  }}
                  maxLength={200}
                  aria-invalid={!!fieldErrors.title}
                  aria-describedby="cs-title-msg"
                />
                <p id="cs-title-msg" className={fieldErrors.title ? s.fieldError : s.fieldHint}>
                  {fieldErrors.title || t('submit.wizard.titleHint')}
                </p>
              </div>

              <div className={s.field}>
                <label htmlFor="cs-desc" className={s.label}>{t('submit.descLabel')}</label>
                <textarea
                  id="cs-desc"
                  className={`${s.input} ${s.textarea} ${fieldErrors.description ? s.inputError : ''}`}
                  rows={4}
                  placeholder={t('submit.descPlaceholder')}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    clearFieldError('description');
                  }}
                  maxLength={3000}
                  aria-invalid={!!fieldErrors.description}
                  aria-describedby="cs-desc-msg"
                />
                <div className={s.fieldFoot}>
                  <p id="cs-desc-msg" className={fieldErrors.description ? s.fieldError : s.fieldHint}>
                    {fieldErrors.description || t('submit.wizard.descHint')}
                  </p>
                  <span className={s.counter}>{description.length}/3000</span>
                </div>
              </div>

              <div className={s.field}>
                <span className={s.label} id="cs-urgency">{t('submit.wizard.urgencyTitle')}</span>
                <div className={s.segmented} role="radiogroup" aria-labelledby="cs-urgency">
                  {PRIORITIES.map((p) => {
                    const meta = PRIORITY_METADATA[p];
                    const on = selectedPriority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={`${s.segment} ${on ? s.segmentOn : ''}`}
                        style={on ? { color: meta.color, backgroundColor: meta.bgActive, borderColor: meta.borderActive } : undefined}
                        onClick={() => setSelectedPriority(p)}
                      >
                        <span className={s.segDot} style={{ backgroundColor: meta.color }} />
                        <span>{t(`submit.wizard.urgency.${p}`)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className={s.fieldHint}>
                  {t(`submit.priorityDesc.${selectedPriority}`)} · {t('submit.slaHours', { range: priMeta.sla })}
                </p>
              </div>
            </section>

            {/* ---------- STEP 2: WHERE ---------- */}
            <section className={s.panel} hidden={step !== 1} aria-labelledby="cs-step-where">
              <header className={s.panelHead}>
                <h2 id="cs-step-where" className={s.panelTitle} tabIndex={-1} ref={headingRef(1)}>
                  {t('submit.wizard.whereTitle')}
                </h2>
                <p className={s.panelHint}>{t('submit.wizard.whereHint')}</p>
              </header>

              {/* Mounted once the step is first opened, then kept so the pin isn't lost */}
              {maxStepReached >= 1 && (
                <LocationPicker
                  initialLat={latitude}
                  initialLng={longitude}
                  onLocationSelect={(lat, lng, addr) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    if (addr) {
                      setAddress(addr);
                      clearFieldError('address');
                    }
                  }}
                  height="320px"
                />
              )}

              <div className={s.field}>
                <label htmlFor="cs-address" className={s.label}>{t('submit.addressLabel')}</label>
                <input
                  id="cs-address"
                  type="text"
                  className={`${s.input} ${fieldErrors.address ? s.inputError : ''}`}
                  placeholder={t('submit.addressPlaceholder')}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    clearFieldError('address');
                  }}
                  aria-invalid={!!fieldErrors.address}
                  aria-describedby="cs-address-msg"
                />
                <p id="cs-address-msg" className={fieldErrors.address ? s.fieldError : s.fieldHint}>
                  {fieldErrors.address || t('submit.guidelines.g2')}
                </p>
              </div>

              <details className={s.disclosure}>
                <summary>
                  <Icon name="expand_more" size={18} className={s.disclosureIcon} />
                  <span>{t('submit.wizard.manualCoords')}</span>
                </summary>
                <div className={s.coordsRow}>
                  <div className={s.field}>
                    <label htmlFor="cs-lat" className={s.label}>{t('submit.latitude')}</label>
                    <input
                      id="cs-lat"
                      type="number"
                      step="any"
                      className={s.input}
                      placeholder={t('submit.latPlaceholder')}
                      value={latitude ?? ''}
                      onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div className={s.field}>
                    <label htmlFor="cs-lng" className={s.label}>{t('submit.longitude')}</label>
                    <input
                      id="cs-lng"
                      type="number"
                      step="any"
                      className={s.input}
                      placeholder={t('submit.lngPlaceholder')}
                      value={longitude ?? ''}
                      onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                </div>
              </details>
            </section>

            {/* ---------- STEP 3: PROOF ---------- */}
            <section className={s.panel} hidden={step !== 2} aria-labelledby="cs-step-proof">
              <header className={s.panelHead}>
                <h2 id="cs-step-proof" className={s.panelTitle} tabIndex={-1} ref={headingRef(2)}>
                  {t('submit.wizard.proofTitle')}
                  <span className={s.optionalPill}>{t('submit.wizard.optional')}</span>
                </h2>
                <p className={s.panelHint}>{t('submit.wizard.proofHint')}</p>
              </header>

              <div className={s.proofGrid}>
                <button
                  type="button"
                  className={`${s.proofTile} ${selectedFiles.length ? s.proofTileOn : ''}`}
                  onClick={() => photoInputRef.current?.click()}
                  disabled={selectedFiles.length >= 5}
                >
                  <span className={s.proofIcon} aria-hidden="true">
                    <Icon name="add_a_photo" size={22} />
                  </span>
                  <span className={s.proofLabel}>
                    {t('submit.wizard.photosLabel')}
                    {selectedFiles.length > 0 ? ` · ${selectedFiles.length}/5` : ''}
                  </span>
                  <span className={s.proofSub}>{t('submit.wizard.photosSub')}</span>
                  <span className={s.proofAction}>
                    <Icon name="add" size={16} />
                    {t('submit.wizard.addPhotos')}
                  </span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    handleImageFileChange(e);
                    e.target.value = '';
                  }}
                  hidden
                />

                <AudioRecorder
                  onAudioChange={(file, duration) => {
                    setAudioFile(file);
                    setAudioDuration(duration);
                  }}
                />

                <button
                  type="button"
                  className={`${s.proofTile} ${videoFile ? s.proofTileOn : ''}`}
                  onClick={() => videoInputRef.current?.click()}
                >
                  <span className={s.proofIcon} aria-hidden="true">
                    <Icon name="videocam" size={22} />
                  </span>
                  <span className={s.proofLabel}>{t('submit.wizard.videoLabel')}</span>
                  <span className={s.proofSub}>{t('submit.wizard.videoSub')}</span>
                  <span className={s.proofAction}>
                    <Icon name="add" size={16} />
                    {t('submit.wizard.addVideo')}
                  </span>
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/*"
                  onChange={handleVideoFileChange}
                  hidden
                />
              </div>

              {previewUrls.length > 0 && (
                <div className={s.thumbs}>
                  {previewUrls.map((url, i) => (
                    <figure key={url} className={s.thumb}>
                      <img src={url} alt={t('submit.photoAlt', { n: i + 1 })} />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className={s.thumbRemove}
                        aria-label={t('submit.removeImage')}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </figure>
                  ))}
                </div>
              )}

              {videoPreviewUrl && (
                <div className={s.videoBox}>
                  <video controls src={videoPreviewUrl} />
                  <div className={s.videoBar}>
                    <span className={s.videoName}>{videoFile?.name || t('submit.videoFallbackName')}</span>
                    <button type="button" onClick={handleRemoveVideo} className={s.removeLink}>
                      <Icon name="delete" size={15} />
                      {t('submit.wizard.remove')}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* ---------- STEP 4: REVIEW ---------- */}
            <section className={s.panel} hidden={step !== 3} aria-labelledby="cs-step-review">
              <header className={s.panelHead}>
                <h2 id="cs-step-review" className={s.panelTitle} tabIndex={-1} ref={headingRef(3)}>
                  {t('submit.wizard.reviewTitle')}
                </h2>
                <p className={s.panelHint}>{t('submit.wizard.reviewHint')}</p>
              </header>

              <dl className={s.reviewList}>
                <div className={s.reviewRow}>
                  <dt>{t('submit.check.category')}</dt>
                  <dd>
                    <span className={s.reviewCat} style={{ color: catMeta.color, backgroundColor: catMeta.bgLight }}>
                      <Icon name={catMeta.icon} size={15} />
                      {t(`categories.${selectedCategory}`)}
                    </span>
                    <span className={s.reviewMuted}>{routeText}</span>
                  </dd>
                  <button type="button" className={s.editBtn} onClick={() => goToStep(0)}>{t('submit.wizard.edit')}</button>
                </div>

                <div className={s.reviewRow}>
                  <dt>{t('submit.wizard.urgencyTitle')}</dt>
                  <dd>
                    <span className={s.reviewUrgency} style={{ color: priMeta.color }}>
                      <span className={s.segDot} style={{ backgroundColor: priMeta.color }} />
                      {t(`submit.wizard.urgency.${selectedPriority}`)}
                    </span>
                    <span className={s.reviewMuted}>{t('submit.slaHours', { range: priMeta.sla })}</span>
                  </dd>
                  <button type="button" className={s.editBtn} onClick={() => goToStep(0)}>{t('submit.wizard.edit')}</button>
                </div>

                <div className={s.reviewRow}>
                  <dt>{t('submit.check.details')}</dt>
                  <dd>
                    <strong className={s.reviewTitle}>{title.trim() || t('submit.wizard.notSet')}</strong>
                    {description.trim() && <span className={s.reviewDesc}>{description.trim()}</span>}
                  </dd>
                  <button type="button" className={s.editBtn} onClick={() => goToStep(0)}>{t('submit.wizard.edit')}</button>
                </div>

                <div className={s.reviewRow}>
                  <dt>{t('submit.check.location')}</dt>
                  <dd>
                    <span>{address.trim() || t('submit.wizard.notSet')}</span>
                    {latitude != null && longitude != null && (
                      <span className={s.reviewMuted}>{Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</span>
                    )}
                  </dd>
                  <button type="button" className={s.editBtn} onClick={() => goToStep(1)}>{t('submit.wizard.edit')}</button>
                </div>

                <div className={s.reviewRow}>
                  <dt>{t('submit.wizard.proofTitle')}</dt>
                  <dd>
                    {proofParts.length ? (
                      <span className={s.reviewChips}>
                        {proofParts.map((part) => (
                          <span key={part} className={s.reviewChip}>{part}</span>
                        ))}
                      </span>
                    ) : (
                      <span className={s.reviewMuted}>{t('submit.chips.noMedia')}</span>
                    )}
                  </dd>
                  <button type="button" className={s.editBtn} onClick={() => goToStep(2)}>{t('submit.wizard.edit')}</button>
                </div>
              </dl>

              {formError && (
                <div className={s.errorBanner} role="alert">
                  <Icon name="error" size={18} />
                  <span>{formError}</span>
                </div>
              )}
            </section>

            {/* ---------- Bottom bar: Back / Continue (stays in reach) ---------- */}
            <div className={s.footer}>
              {step > 0 ? (
                <button type="button" className={s.backBtn} onClick={() => goToStep(step - 1)}>
                  <Icon name="arrow_back" size={18} />
                  <span>{t('common.back')}</span>
                </button>
              ) : (
                <span />
              )}
              <span className={s.stepCount}>
                {t('submit.wizard.stepOf', { n: step + 1, total: STEPS.length })}
              </span>
              <button type="submit" className={s.nextBtn} disabled={isSubmitting}>
                <span>{nextLabel}</span>
                <Icon name={isLast ? 'send' : 'arrow_forward'} size={18} />
              </button>
            </div>
          </form>
        </div>

        {/* ================= SIDEBAR ================= */}
        <aside className={s.sidebar}>
          <div className={s.summaryCard}>
            <div className={s.summaryHead}>
              <h3 className={s.summaryTitle}>{t('submit.wizard.summaryTitle')}</h3>
              <span className={s.summaryPct}>{readiness.score}%</span>
            </div>
            <div className={s.summaryTrack} aria-hidden="true">
              <div className={s.summaryFill} style={{ width: `${readiness.score}%` }} />
            </div>
            <ul className={s.summaryList}>
              <li className={readiness.checks.category ? s.sumDone : ''}>
                <Icon name={readiness.checks.category ? 'check_circle' : 'radio_button_unchecked'} size={18} />
                <div>
                  <span className={s.sumLabel}>{t('submit.check.category')}</span>
                  <span className={s.sumValue}>{t(`categories.${selectedCategory}`)}</span>
                </div>
              </li>
              <li className={readiness.checks.details ? s.sumDone : ''}>
                <Icon name={readiness.checks.details ? 'check_circle' : 'radio_button_unchecked'} size={18} />
                <div>
                  <span className={s.sumLabel}>{t('submit.check.details')}</span>
                  <span className={s.sumValue}>{title.trim() || t('submit.wizard.notSet')}</span>
                </div>
              </li>
              <li className={readiness.checks.location ? s.sumDone : ''}>
                <Icon name={readiness.checks.location ? 'check_circle' : 'radio_button_unchecked'} size={18} />
                <div>
                  <span className={s.sumLabel}>{t('submit.check.location')}</span>
                  <span className={s.sumValue}>{address.trim() || t('submit.wizard.notSet')}</span>
                </div>
              </li>
              <li className={readiness.checks.media ? s.sumDone : ''}>
                <Icon name={readiness.checks.media ? 'check_circle' : 'radio_button_unchecked'} size={18} />
                <div>
                  <span className={s.sumLabel}>{t('submit.wizard.proofTitle')}</span>
                  <span className={s.sumValue}>{proofParts.length ? proofParts.join(' · ') : t('submit.wizard.optional')}</span>
                </div>
              </li>
            </ul>
          </div>

          <div className={s.tipCard}>
            <Icon name="lightbulb" size={18} />
            <p>
              <strong>{t('submit.wizard.tip')}:</strong> {t(STEP_TIPS[step])}
            </p>
          </div>

          <div className={s.helpCard}>
            <h3 className={s.helpTitle}>
              <Icon name="call" size={16} />
              <span>{t('submit.wizard.needHelp')}</span>
            </h3>
            <ul className={s.helpList}>
              <li>
                <span>{t('submit.controlRoom')}</span>
                <a href="tel:18003457788">1800-345-7788</a>
              </li>
              <li>
                <span>{t('submit.electricityHelpline')}</span>
                <a href="tel:1912">1912</a>
              </li>
              <li>
                <span>{t('submit.waterHelpline')}</span>
                <a href="tel:06632400123">0663-2400123</a>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* ================= COMPLAINT SUCCESS SCREEN / MODAL ================= */}
      {submittedData && (
        <div className={s.successOverlay} onClick={closeSuccess}>
          <div
            className={s.successCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cs-success-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={s.successClose}
              onClick={closeSuccess}
              aria-label={t('submit.wizard.close')}
            >
              <Icon name="close" size={18} />
            </button>

            <div className={s.successCheckIcon}>
              <Icon name="check" size={32} />
            </div>

            <h3 id="cs-success-title" className={s.successTitle}>{t('submit.successModalTitle')}</h3>
            <p className={s.successMsg}>
              {t('submit.successModalSubtitle')}
            </p>

            <div className={s.trackingBox}>
              <span className={s.trackingBoxLabel}>{t('common.trackingCode')}</span>
              <div className={s.trackingCodeRow}>
                <span className={s.trackingBoxCode}>{submittedData.tracking_code}</span>
                <button
                  type="button"
                  className={s.copyBtn}
                  onClick={() => copyCode(submittedData.tracking_code)}
                >
                  <Icon name="content_copy" size={15} />
                  <span>{t('submit.wizard.copy')}</span>
                </button>
              </div>
            </div>

            <div className={s.successDetailsRow}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--cs-text-muted)', display: 'block' }}>{t('common.status')}</span>
                <span className={s.badgePriorityMedium} style={{ display: 'inline-block', marginTop: 4 }}>
                  {t(`statuses.${submittedData.status}`) || submittedData.status}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--cs-text-muted)', display: 'block' }}>{t('submit.assignedDept')}</span>
                <strong style={{ fontSize: 13, color: '#3B2418', display: 'inline-block', marginTop: 4 }}>
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
              <button type="button" onClick={closeSuccess} className={s.successBtnList}>
                <Icon name="add" size={16} />
                <span>{t('submit.fileAnotherBtn')}</span>
              </button>
            </div>

            {/* Closes on its own: the bar runs down, pausing while hovered or focused */}
            <p className={s.autoCloseHint}>{t('submit.wizard.autoClose')}</p>
            <div className={s.autoCloseTrack} aria-hidden="true">
              <div
                className={s.autoCloseBar}
                style={{ animationDuration: `${SUCCESS_AUTO_CLOSE_MS}ms` }}
                onAnimationEnd={closeSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitComplaint;
