import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import { ComplaintCategory, ComplaintPriority } from '../../types/complaint';
import { useToast } from '../../components/ui/Toast';
import Icon from '../../components/ui/Icon';
import LocationPicker from '../../components/map/LocationPicker';
import { smartDetectGps, resolveAddressToCoords } from '../../config/mapConfig';
import aiService, { AIClassificationResult } from '../../services/ai.service';
import s from './SubmitComplaint.module.css';

const DEPARTMENT_MAP: Record<string, { name: string; defaultSla: string }> = {
  ROAD: { name: 'Roads & Infrastructure', defaultSla: '24 hours' },
  WATER: { name: 'Water Supply', defaultSla: '12 hours' },
  ELECTRICITY: { name: 'Electricity Department', defaultSla: '6 hours' },
  DRAINAGE: { name: 'Drainage & Sewage', defaultSla: '18 hours' },
  SANITATION: { name: 'Sanitation & Waste', defaultSla: '12 hours' },
};

export const SubmitComplaint: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { submitComplaint } = useComplaintStore();
  const { success, error: toastError } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory>('ROAD');
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority>('MEDIUM');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // AI Live Classification State
  const [aiPrediction, setAiPrediction] = useState<AIClassificationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeReqIdRef = useRef<number>(0);

  const [geoLoading, setGeoLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Success Modal State
  const [submittedData, setSubmittedData] = useState<{
    tracking_code: string;
    department_name: string;
    status: string;
  } | null>(null);

  // Live AI classification from backend API
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const currentReqId = ++activeReqIdRef.current;
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (trimmedTitle.length < 3 && trimmedDesc.length < 3) {
      setAiPrediction(null);
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await aiService.classifyComplaint(trimmedTitle, trimmedDesc, address.trim());
        if (currentReqId === activeReqIdRef.current) {
          setAiPrediction(result);
          if (result?.predicted_category) {
            setSelectedCategory(result.predicted_category as ComplaintCategory);
          }
          if (result?.predicted_priority) {
            setSelectedPriority(result.predicted_priority as ComplaintPriority);
          }
        }
      } catch (err) {
        if (currentReqId === activeReqIdRef.current) {
          console.error('Live AI classification failed:', err);
        }
      } finally {
        if (currentReqId === activeReqIdRef.current) {
          setIsAnalyzing(false);
        }
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [title, description, address]);

  const userWardName = useMemo(() => {
    if (!user?.address) return 'Modipara';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toastError(`File "${file.name}" exceeds maximum size limit of 5MB.`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Please enter a descriptive complaint title.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please describe the issue in detail.');
      return;
    }

    if (!address.trim()) {
      setFormError('Please provide a specific street address or location description.');
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
      });

      const deptName =
        created.department_name ||
        created.category_display ||
        DEPARTMENT_MAP[created.category || selectedCategory]?.name ||
        created.category;

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

  // Determine dynamic department and priority labels from backend
  const displayDepartment =
    aiPrediction?.predicted_department ||
    aiPrediction?.department_routing?.db_department_name ||
    aiPrediction?.department_routing?.predicted_department ||
    (aiPrediction?.predicted_category ? DEPARTMENT_MAP[aiPrediction.predicted_category]?.name || aiPrediction.predicted_category : DEPARTMENT_MAP[selectedCategory]?.name);

  const displayCategory = aiPrediction?.predicted_category || selectedCategory;
  const displayPriority = aiPrediction?.predicted_priority || selectedPriority;
  const displayConfidence = aiPrediction ? Math.round(aiPrediction.confidence_score * 100) : null;
  const displaySla = aiPrediction?.estimated_resolution_hours
    ? `${aiPrediction.estimated_resolution_hours} hours`
    : null;

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.pageHeader}>
        <h1 className={s.title}>Report a Civic Issue</h1>
        <p className={s.subtitle}>
          Provide the details below. CivicSetu's AI system will automatically analyze and route your grievance.
        </p>
      </div>

      {!isAuthenticated && (
        <div className={s.anonNoticeBanner}>
          <div className={s.anonBadge}>
            <Icon name="visibility_off" size={17} />
            <span>Anonymous Reporting Active — No Login Required</span>
          </div>
          <p className={s.anonNoticeText}>
            Your identity and personal details will remain completely anonymous. Upon submission, our AI Engine immediately routes your issue to the correct department and generates a municipal <strong>Tracking Code</strong> (e.g. <code>CMP-YYYYMMDD-XXXX</code>) to track progress anytime.
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
                <span>Grievance Details</span>
              </h3>

              <div className={s.fieldGroup}>
                <div>
                  <label className={s.inputLabel}>
                    Complaint Title <span className={s.req}>*</span>
                  </label>
                  <input
                    type="text"
                    className={s.textInput}
                    placeholder="e.g. Broken water pipeline leaking on Main Road"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className={s.inputLabel}>
                    Complaint Description <span className={s.req}>*</span>
                  </label>
                  <textarea
                    className={s.textarea}
                    rows={4}
                    placeholder="Provide complete details about the civic issue (e.g. exact spot, severity, duration, impact on traffic or water supply)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                  <span>Complaint Location</span>
                </h3>

                <div className={s.locationActionGroup}>
                  <button
                    type="button"
                    onClick={handleUseMyWard}
                    disabled={geoLoading}
                    className={`${s.locBtn} ${s.locBtnOrange}`}
                    title={`Apply registered ward: ${user?.address || 'Modipara'}`}
                  >
                    <Icon name="home_pin" size={15} />
                    <span>My Ward ({userWardName})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLocationDetect}
                    disabled={geoLoading}
                    className={`${s.locBtn} ${s.locBtnBlue}`}
                  >
                    <Icon name={geoLoading ? 'hourglass_top' : 'my_location'} size={15} />
                    <span>{geoLoading ? 'Detecting...' : 'Use My Current Location'}</span>
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
                    Street Address / Landmark <span className={s.req}>*</span>
                  </label>
                  <input
                    type="text"
                    className={s.textInput}
                    placeholder="e.g. Near Community Center, Main Road, Ward 4"
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

            {/* Step 3: Photo Evidence Upload */}
            <div className={s.section}>
              <h3 className={s.sectionHeading}>
                <span className={s.stepNum}>3</span>
                <span>Upload Photo Evidence</span>
              </h3>

              <div className={s.uploadDropArea}>
                <input
                  type="file"
                  id="fileUpload"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className={s.fileInput}
                />
                <div className={s.uploadIcon}>
                  <Icon name="add_a_photo" size={26} />
                </div>
                <h4 className={s.uploadTitle}>Drag & drop photo evidence or click to browse</h4>
                <p className={s.uploadSub}>Supports PNG, JPG, WebP up to 5MB each</p>
              </div>

              {previewUrls.length > 0 && (
                <div className={s.previewGrid}>
                  {previewUrls.map((url, i) => (
                    <div key={url} className={s.previewItem}>
                      <img src={url} alt={`Evidence ${i + 1}`} className={s.previewImg} />
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

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={s.submitBtn}
            >
              <Icon name="send" size={18} />
              <span>{isSubmitting ? 'Submitting Grievance...' : 'Submit Grievance'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: AI Auto-Triage Section */}
        <div className={s.sidebarCol}>
          {/* AI Model Auto-Triage Card (Section 8 & 9) */}
          <div className={s.triageCard}>
            <div className={s.triageHeader}>
              <div className={s.triageTitleGroup}>
                <h4 className={s.triageTitle}>
                  <Icon name="smart_toy" size={20} style={{ color: 'var(--cz-accent-blue, #5b9fcb)' }} />
                  <span>AI Model Auto-Triage</span>
                </h4>
                <p className={s.triageSubtitle}>
                  Your complaint is analyzed automatically using CivicSetu's trained ML models.
                </p>
              </div>
              <span className={s.aiStatusPill}>
                <span className={s.pulseDot} />
                {isAnalyzing ? 'Analyzing...' : aiPrediction ? 'Classified' : 'Ready'}
              </span>
            </div>

            {isAnalyzing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: 'var(--cz-secondary-text, #64748b)', fontSize: 13 }}>
                <span className={s.pulseDot} />
                <span>Analyzing your complaint with trained ML models...</span>
              </div>
            ) : (
              <div className={s.aiResultBox}>
                <div className={s.aiBadgeRow}>
                  <span className={s.aiBadgeLabel}>Category</span>
                  <span className={s.aiBadgeValue}>
                    {aiPrediction ? displayCategory : 'Pending input...'}
                  </span>
                </div>

                <div className={s.aiBadgeRow}>
                  <span className={s.aiBadgeLabel}>Department</span>
                  <span className={s.aiBadgeValue} style={{ color: 'var(--cz-accent-blue-dark, #2c6e97)' }}>
                    {aiPrediction ? displayDepartment : 'Auto-routed by AI'}
                  </span>
                </div>

                <div className={s.aiBadgeRow}>
                  <span className={s.aiBadgeLabel}>Priority</span>
                  <div>
                    {aiPrediction ? (
                      <span
                        className={
                          displayPriority === 'HIGH'
                            ? s.badgePriorityHigh
                            : displayPriority === 'LOW'
                            ? s.badgePriorityLow
                            : s.badgePriorityMedium
                        }
                      >
                        {displayPriority}
                      </span>
                    ) : (
                      <span className={s.badgePriorityMedium}>MEDIUM</span>
                    )}
                  </div>
                </div>

                {displayConfidence !== null && (
                  <div className={s.aiBadgeRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={s.aiBadgeLabel}>Confidence</span>
                      <strong style={{ fontSize: 13, color: '#0f172a' }}>{displayConfidence}%</strong>
                    </div>
                    <div className={s.confidenceTrack}>
                      <div className={s.confidenceFill} style={{ width: `${displayConfidence}%` }} />
                    </div>
                  </div>
                )}

                <div className={s.aiBadgeRow}>
                  <span className={s.aiBadgeLabel}>SLA</span>
                  <span className={s.aiBadgeValue} style={{ fontSize: 12.5, color: 'var(--cz-secondary-text, #64748b)' }}>
                    {displaySla ? displaySla : 'SLA: Being calculated'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Filing Guidelines Card */}
          <div className={s.guidelinesCard}>
            <h4 className={s.guidelinesTitle}>Filing Guidelines</h4>
            <ul className={s.guideList}>
              <li>Department and priority are automatically classified by trained AI models.</li>
              <li>Include prominent landmarks or building names in your address.</li>
              <li>Upload clear, well-lit photos showing the scale of the issue.</li>
              <li>Track real-time progress anytime with your tracking code.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ================= COMPLAINT SUCCESS SCREEN / MODAL (SECTION 13) ================= */}
      {submittedData && (
        <div className={s.successOverlay}>
          <div className={s.successCard}>
            <div className={s.successCheckIcon}>
              <Icon name="check" size={32} />
            </div>

            <h3 className={s.successTitle}>✓ Complaint Registered</h3>
            <p className={s.successMsg}>
              Your grievance has been successfully submitted to the concerned municipal department.
            </p>

            <div className={s.trackingBox}>
              <span className={s.trackingBoxLabel}>Complaint ID</span>
              <span className={s.trackingBoxCode}>{submittedData.tracking_code}</span>
            </div>

            <div className={s.successDetailsRow}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--cz-secondary-text, #64748b)', display: 'block' }}>Status</span>
                <span className={s.badgePriorityMedium} style={{ display: 'inline-block', marginTop: 4 }}>
                  {submittedData.status}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--cz-secondary-text, #64748b)', display: 'block' }}>Department</span>
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
                <span>Track Status</span>
              </Link>
              <Link
                to="/citizen/complaints"
                className={s.successBtnList}
              >
                <Icon name="assignment" size={16} />
                <span>View My Grievances</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitComplaint;
