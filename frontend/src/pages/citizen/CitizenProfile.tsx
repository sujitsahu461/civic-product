import React, { useState } from 'react';
import useAuthStore from '../../store/authStore';
import useComplaintStore from '../../store/complaintStore';
import authService from '../../services/auth.service';
import { useToast } from '../../components/ui/Toast';
import Icon from '../../components/ui/Icon';
import { formatDate } from '../../utils/formatters';
import s from './CitizenProfile.module.css';

export const CitizenProfile: React.FC = () => {
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
      success('Profile details updated successfully.');
    } catch (err: any) {
      toastError(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toastError('Password must be at least 8 characters long.');
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      success('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toastError(err.message || 'Failed to change password. Verify old password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const avatarInitial = user?.full_name ? user.full_name.trim()[0].toUpperCase() : 'C';

  return (
    <div className={s.container}>
      <div className={s.pageHeader}>
        <h1 className={s.title}>Citizen Profile</h1>
        <p className={s.subtitle}>
          Manage your contact credentials, jurisdictional ward, and account security.
        </p>
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

          <h2 className={s.userName}>{user?.full_name || 'Citizen User'}</h2>
          <p className={s.userEmail}>{user?.email}</p>

          <div className={s.badgeRow}>
            <span className={s.citizenBadge}>Verified Citizen</span>
          </div>

          {/* Complaint Statistics (Section 18) */}
          <div className={s.statsSection}>
            <div className={s.statSmallCard}>
              <span className={s.statSmallVal}>{totalCount}</span>
              <span className={s.statSmallLabel}>Total Complaints</span>
            </div>
            <div className={s.statSmallCard}>
              <span className={s.statSmallVal} style={{ color: '#c25e00' }}>{pendingCount}</span>
              <span className={s.statSmallLabel}>Pending</span>
            </div>
            <div className={s.statSmallCard}>
              <span className={s.statSmallVal} style={{ color: '#2c6e97' }}>{inProgressCount}</span>
              <span className={s.statSmallLabel}>In Progress</span>
            </div>
            <div className={s.statSmallCard}>
              <span className={s.statSmallVal} style={{ color: '#236b43' }}>{resolvedCount}</span>
              <span className={s.statSmallLabel}>Resolved</span>
            </div>
          </div>
        </div>

        {/* Right: Personal Info & Password Forms */}
        <div className={s.formCardsCol}>
          {/* Personal Information */}
          <div className={s.card}>
            <h3 className={s.cardTitle}>Personal Information</h3>
            <form onSubmit={handleProfileSave}>
              <div className={s.formGrid}>
                <div className={s.inputGroup}>
                  <label className={s.label}>Full Name</label>
                  <input
                    type="text"
                    className={s.input}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className={s.inputGroup}>
                  <label className={s.label}>Phone Number</label>
                  <input
                    type="tel"
                    className={s.input}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>

                <div className={`${s.inputGroup} ${s.fullWidth}`}>
                  <label className={s.label}>Residential Ward / Street Address</label>
                  <input
                    type="text"
                    className={s.input}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Modipara, Ward 12, Sambalpur"
                  />
                </div>

                <div className={`${s.inputGroup} ${s.fullWidth}`}>
                  <label className={s.label}>Community Bio</label>
                  <textarea
                    rows={2}
                    className={s.input}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Active resident and community volunteer..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className={s.btnSave}
              >
                <Icon name="save" size={16} />
                <span>{profileLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </form>
          </div>

          {/* Account Security */}
          <div className={s.card}>
            <h3 className={s.cardTitle}>Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div className={s.formGrid}>
                <div className={`${s.inputGroup} ${s.fullWidth}`}>
                  <label className={s.label}>Current Password</label>
                  <input
                    type="password"
                    className={s.input}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>

                <div className={s.inputGroup}>
                  <label className={s.label}>New Password</label>
                  <input
                    type="password"
                    className={s.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className={s.inputGroup}>
                  <label className={s.label}>Confirm New Password</label>
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
                style={{ background: 'var(--cz-secondary-light-blue, #eaf6fc)', color: 'var(--cz-accent-blue-dark, #2c6e97)', borderColor: 'var(--cz-primary-light-blue, #dceffd)' }}
              >
                <Icon name="lock_reset" size={16} />
                <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenProfile;
