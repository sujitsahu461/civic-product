import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import authService from '../../services/auth.service';
import { useToast } from '../../components/ui/Toast';
import Icon from '../../components/ui/Icon';
import LanguageSelector from '../../components/ui/LanguageSelector';
import s from './CitizenProfile.module.css';

export const CitizenProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const { complaints } = useComplaintStore();
  const { success, error: toastError } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || user?.phone_number || '');
  const [address, setAddress] = useState(user?.address || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileLoading, setProfileLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const totalCount = complaints.length;
  const pendingCount = complaints.filter(
    (c) => c.status === 'PENDING' || c.status === 'ASSIGNED'
  ).length;
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length;

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await updateProfile({
        full_name: fullName,
        phone,
        address,
        bio,
      });
      success(t('profile.updatedSuccess'));
    } catch (err: any) {
      toastError(err.message || t('profile.updateFailed'));
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError(t('profile.pwMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      toastError(t('auth.common.passwordMinLength'));
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      success(t('profile.pwChanged'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toastError(err.message || t('profile.pwChangeFailed'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const avatarInitial = user?.full_name ? user.full_name.trim()[0].toUpperCase() : 'C';

  return (
    <div className={s.container}>
      <div className={s.pageHeader}>
        <h1 className={s.title}>{t('profile.title')}</h1>
        <p className={s.subtitle}>{t('profile.subtitle')}</p>
      </div>

      <div className={s.grid}>
        {/* Left: Summary Card */}
        <div className={s.summaryCard}>
          <div className={s.avatarWrapper}>
            <div className={s.avatar}>{avatarInitial}</div>
            <div className={s.verifiedIcon}>
              <Icon name="verified" size={16} />
            </div>
          </div>

          <h2 className={s.userName}>{user?.full_name || t('profile.userFallback')}</h2>
          <p className={s.userEmail}>{user?.email}</p>

          <div className={s.badgeRow}>
            <span className={s.citizenBadge}>{t('profile.verifiedBadge')}</span>
          </div>

          {/* Language Preference Section */}
          <div className="my-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-left">
            <span className="text-xs font-bold text-gray-700 block mb-1.5">
              {t('profile.langPreference')}
            </span>
            <LanguageSelector variant="full" />
          </div>

          {/* Complaint Statistics */}
          <div className={s.statsSection}>
            <div className={s.statSmallCard}>
              <span className={s.statSmallVal}>{totalCount}</span>
              <span className={s.statSmallLabel}>{t('dashboard.statTotal')}</span>
            </div>
            <div className={s.statSmallCard}>
              <span className={s.statSmallVal} style={{ color: '#B93E0C' }}>{pendingCount}</span>
              <span className={s.statSmallLabel}>{t('dashboard.statPending')}</span>
            </div>
            <div className={s.statSmallCard}>
              <span className={s.statSmallVal} style={{ color: '#7A1F2B' }}>{inProgressCount}</span>
              <span className={s.statSmallLabel}>{t('dashboard.statInProgress')}</span>
            </div>
            <div className={s.statSmallCard}>
              <span className={s.statSmallVal} style={{ color: '#1F6B3F' }}>{resolvedCount}</span>
              <span className={s.statSmallLabel}>{t('dashboard.statResolved')}</span>
            </div>
          </div>
        </div>

        {/* Right: Personal Info & Password Forms */}
        <div className={s.formCardsCol}>
          {/* Personal Information */}
          <div className={s.card}>
            <h3 className={s.cardTitle}>{t('profile.personalInfo')}</h3>
            <form onSubmit={handleProfileSave}>
              <div className={s.formGrid}>
                <div className={s.inputGroup}>
                  <label className={s.label}>{t('auth.fullNameLabel')}</label>
                  <input
                    type="text"
                    className={s.input}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className={s.inputGroup}>
                  <label className={s.label}>{t('auth.phoneLabel')}</label>
                  <input
                    type="tel"
                    className={s.input}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('profile.phonePlaceholder')}
                  />
                </div>

                <div className={`${s.inputGroup} ${s.fullWidth}`}>
                  <label className={s.label}>{t('auth.addressLabel')}</label>
                  <input
                    type="text"
                    className={s.input}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('auth.addressPlaceholder')}
                  />
                </div>

                <div className={`${s.inputGroup} ${s.fullWidth}`}>
                  <label className={s.label}>{t('profile.bioLabel')}</label>
                  <textarea
                    rows={2}
                    className={s.input}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t('profile.bioPlaceholder')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className={s.btnSave}
              >
                <Icon name="save" size={16} />
                <span>{profileLoading ? t('common.submitting') : t('profile.updateBtn')}</span>
              </button>
            </form>
          </div>

          {/* Account Security */}
          <div className={s.card}>
            <h3 className={s.cardTitle}>{t('profile.changePassword')}</h3>
            <form onSubmit={handlePasswordChange}>
              <div className={s.formGrid}>
                <div className={`${s.inputGroup} ${s.fullWidth}`}>
                  <label className={s.label}>{t('profile.currentPassword')}</label>
                  <input
                    type="password"
                    className={s.input}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>

                <div className={s.inputGroup}>
                  <label className={s.label}>{t('auth.reset.newPasswordLabel')}</label>
                  <input
                    type="password"
                    className={s.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className={s.inputGroup}>
                  <label className={s.label}>{t('auth.reset.confirmNewLabel')}</label>
                  <input
                    type="password"
                    className={s.input}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className={s.btnSave}
                style={{ background: 'var(--cs-maroon-wash)', color: 'var(--cs-maroon)', borderColor: 'var(--cs-maroon-light)' }}
              >
                <Icon name="lock_reset" size={16} />
                <span>{passwordLoading ? t('common.loading') : t('profile.updatePassword')}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenProfile;
