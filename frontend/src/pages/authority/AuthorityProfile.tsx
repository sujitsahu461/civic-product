import React, { useState } from 'react';
import useAuthStore from '../../store/authStore';
import authService from '../../services/auth.service';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import s from './AuthorityProfile.module.css';

export const AuthorityProfile: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const { success, error: toastError } = useToast();

  // Profile fields state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || user?.phone_number || '');
  const [department, setDepartment] = useState(user?.department || 'Municipal Administration');
  const [address, setAddress] = useState(user?.address || 'Central Municipal Ward 4');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password fields state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await updateProfile({
        full_name: fullName,
        phone,
        department,
        address,
        bio,
      });
      success('Authority profile credentials updated successfully.');
    } catch (err: any) {
      toastError(err.message || 'Failed to update authority profile.');
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
      success('Authority account password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toastError(err.message || 'Failed to change password. Verify current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.pageHeader}>
        <h1 className={s.title}>Nodal Officer & Authority Profile</h1>
        <p className={s.subtitle}>
          Manage departmental assignment, nodal jurisdiction, hotline contact, and security credentials.
        </p>
      </div>

      <div className={s.grid}>
        {/* Left Column: Officer Summary Card */}
        <div className={s.summaryCard}>
          <div className={s.avatarWrapper}>
            <div className={s.avatar}>
              {user?.full_name ? user.full_name[0].toUpperCase() : 'O'}
            </div>
            <div className={s.verifiedIcon} title="Authorized Municipal Officer">
              <Icon name="shield" size={15} />
            </div>
          </div>

          <h2 className={s.userName}>{user?.full_name || 'Nodal Officer'}</h2>
          <p className={s.userEmail}>{user?.email}</p>

          <div className={s.badgeRow}>
            <Badge variant="authority">Nodal Officer</Badge>
            <Badge variant="success">Active Duty</Badge>
          </div>

          <div className={s.metaList}>
            <div className={s.metaItem}>
              <div className={s.metaIcon}>
                <Icon name="domain" size={18} />
              </div>
              <div>
                <div className={s.metaLabel}>Assigned Department</div>
                <div className={s.metaValue}>{user?.department || 'Municipal Administration'}</div>
              </div>
            </div>

            <div className={s.metaItem}>
              <div className={s.metaIcon}>
                <Icon name="badge" size={18} />
              </div>
              <div>
                <div className={s.metaLabel}>Authority Officer ID</div>
                <div className={s.metaValue}>
                  {user?.public_id?.slice(0, 8).toUpperCase() || 'AUTH-4091'}
                </div>
              </div>
            </div>

            <div className={s.metaItem}>
              <div className={s.metaIcon}>
                <Icon name="location_on" size={18} />
              </div>
              <div>
                <div className={s.metaLabel}>Jurisdiction</div>
                <div className={s.metaValue}>{user?.address || 'Central District / Ward 4'}</div>
              </div>
            </div>

            <div className={s.metaItem}>
              <div className={s.metaIcon}>
                <Icon name="security" size={18} />
              </div>
              <div>
                <div className={s.metaLabel}>Authorization Level</div>
                <div className={s.metaValue}>Level 2 Nodal Dispatcher</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Edit & Security Forms */}
        <div className={s.formsColumn}>
          {/* Departmental & Contact Details */}
          <form onSubmit={handleProfileSave} className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.cardIcon}>
                <Icon name="assignment_ind" size={20} />
              </div>
              <div>
                <h3 className={s.cardTitle}>Officer Contact & Departmental Scope</h3>
                <p className={s.cardSub}>Update your name, hotline number, and ward responsibility.</p>
              </div>
            </div>

            <div className={s.formGrid}>
              <Input
                label="Full Name*"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Officer Full Name"
                leftIcon={<Icon name="person" size={18} />}
                required
              />

              <Input
                label="Official Email Address"
                value={user?.email || ''}
                disabled
                helperText="Government login email cannot be modified directly"
                leftIcon={<Icon name="mail" size={18} />}
              />

              <Input
                label="Official Phone / Emergency Hotline"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                leftIcon={<Icon name="call" size={18} />}
              />

              <Input
                label="Department Scope"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Roads & Infrastructure"
                leftIcon={<Icon name="domain" size={18} />}
              />

              <div className={s.fullWidth}>
                <Input
                  label="Jurisdiction / Ward Location"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Ward 4, Municipal Zone A"
                  leftIcon={<Icon name="location_on" size={18} />}
                />
              </div>

              <div className={s.fullWidth}>
                <Input
                  label="Operational Bio & Designation"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Executive Engineer in charge of rapid municipal repairs"
                  leftIcon={<Icon name="info" size={18} />}
                />
              </div>
            </div>

            <div className={s.cardActions}>
              <Button type="submit" variant="primary" size="md" isLoading={profileLoading}>
                Save Profile Changes
              </Button>
            </div>
          </form>

          {/* Security & Password Form */}
          <form onSubmit={handlePasswordChange} className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.cardIcon}>
                <Icon name="lock" size={20} />
              </div>
              <div>
                <h3 className={s.cardTitle}>Account Security & Password</h3>
                <p className={s.cardSub}>Ensure your officer account uses a strong, secure passphrase.</p>
              </div>
            </div>

            <div className={s.formGrid}>
              <div className={s.fullWidth}>
                <Input
                  label="Current Password*"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  leftIcon={<Icon name="key" size={18} />}
                  required
                />
              </div>

              <Input
                label="New Password*"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                leftIcon={<Icon name="lock_reset" size={18} />}
                required
              />

              <Input
                label="Confirm New Password*"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                leftIcon={<Icon name="lock_reset" size={18} />}
                required
              />
            </div>

            <div className={s.cardActions}>
              <Button type="submit" variant="outline" size="md" isLoading={passwordLoading}>
                Update Security Credentials
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthorityProfile;
