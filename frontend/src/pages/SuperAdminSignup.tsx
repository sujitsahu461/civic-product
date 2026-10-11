import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import s from './Login.module.css';

export const SuperAdminSignup: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [securityKey, setSecurityKey] = useState('CIVICSETU-ADMIN-2025');
  const [designation, setDesignation] = useState('Municipal Commissioner');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFillPasskey = () => {
    setSecurityKey('CIVICSETU-ADMIN-2025');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!termsAgreed) {
      setFormError('Please accept the Executive Administrator Charter to proceed.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify both fields.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (!securityKey.trim()) {
      setFormError('Master Administrator Security Passkey is required (use CIVICSETU-ADMIN-2025).');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        role: 'SUPER_ADMIN',
        department: 'Municipal Administration',
        designation: designation.trim() || 'Executive Administrator',
        security_key: securityKey.trim(),
      });

      success(`Super Administrator provisioned successfully! Welcome, ${fullName}.`);
      navigate('/superadmin/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Administrator registration failed. Please verify the entered information.';
      setFormError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.authCard} style={{ borderColor: '#cbd5e1' }}>
        {/* Left Visual Panel */}
        <div className={s.leftPanel} style={{ background: 'linear-gradient(165deg, #0f172a 0%, #1e1b4b 55%, #172554 100%)', color: '#f8fafc' }}>
          <div className={s.leftGlow} style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)' }} />

          <div className={s.visualTopRow}>
            <Link to="/" className={s.brandHeader} style={{ textDecoration: 'none' }}>
              <div className={s.brandLogo} style={{ background: '#1e293b', borderColor: '#334155' }}>
                <img src="/logo-mark.png" alt="CivicSetu" className={s.brandLogoImg} />
              </div>
              <div className={s.brandMeta}>
                <span className={s.brandName} style={{ color: '#ffffff' }}>CivicSetu</span>
                <span className={s.brandBadge} style={{ background: '#312e81', color: '#a5b4fc', borderColor: '#4338ca' }}>
                  ADMIN AUTHORIZATION
                </span>
              </div>
            </Link>

            <div className={s.sealWrapper}>
              <span style={{ fontSize: '28px' }}>🛡️</span>
            </div>
          </div>

          <div className={s.visualBody}>
            <div className={s.visualTagline}>
              <span className={s.taglineDot} style={{ background: '#818cf8' }} />
              <span style={{ color: '#cbd5e1' }}>Executive Provisioning</span>
            </div>

            <h1 className={s.editorialHeading} style={{ color: '#ffffff' }}>
              Platform Governance.<br />
              Master Control.<br />
              Executive Audit.
            </h1>

            <p className={s.editorialSubheading} style={{ color: '#94a3b8' }}>
              Authorize and provision super administrator accounts with root system privileges across all civic modules and urban local bodies.
            </p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#c7d2fe', border: '1px solid rgba(255,255,255,0.15)' }}>
                ✓ Root RBAC Privileges
              </span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#c7d2fe', border: '1px solid rgba(255,255,255,0.15)' }}>
                ✓ Full System Telemetry
              </span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#c7d2fe', border: '1px solid rgba(255,255,255,0.15)' }}>
                ✓ Passkey-Protected Setup
              </span>
            </div>
          </div>

          <div className={s.visualFooter}>
            <Link to="/" style={{ color: '#a5b4fc', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              ← Return to Main Homepage
            </Link>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className={s.rightPanel}>
          <div className={s.formWrapper}>
            <div className={s.formHeader}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ede9fe', color: '#6d28d9', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                <Icon name="admin_panel_settings" size={14} />
                <span>Super Administrator Setup</span>
              </div>
              <h2 className={s.title}>Register Super Admin</h2>
              <p className={s.subtitle}>
                Enter your details and the master authorization passkey to provision an executive root account.
              </p>
            </div>

            {/* Notice for existing pre-seeded super admin account */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>Default Admin:</span>{' '}
                <span>admin@civicsetu.gov.in</span>
              </div>
              <Link
                to="/login/superadmin"
                style={{
                  background: '#e0e7ff',
                  color: '#4338ca',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                Log In Instead
              </Link>
            </div>

            {/* Helper pill for passkey */}
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="key" size={18} style={{ color: '#7c3aed' }} />
                <span style={{ fontSize: '12px', color: '#5b21b6', fontWeight: 600 }}>Master Passkey: CIVICSETU-ADMIN-2025</span>
              </div>
              <button
                type="button"
                onClick={handleFillPasskey}
                style={{ background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Auto-Fill
              </button>
            </div>

            {formError && (
              <div className={s.errorBanner} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="error" size={18} />
                  <span>{formError}</span>
                </div>
                {formError.toLowerCase().includes('already exists') && (
                  <Link
                    to="/login/superadmin"
                    style={{
                      color: '#b91c1c',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      fontSize: '12px',
                      marginLeft: '26px'
                    }}
                  >
                    Click here to Sign In with your existing account →
                  </Link>
                )}
              </div>
            )}

            <form className={s.form} onSubmit={handleSubmit}>
              <div className={s.fieldGroup}>
                <Input
                  label="Administrator Full Name"
                  type="text"
                  placeholder="e.g. Dr. S. Mohanty (IAS)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  leftIcon={<Icon name="person" size={18} />}
                />
              </div>

              <div className={s.formRow}>
                <div className={s.fieldGroup}>
                  <Input
                    label="Executive Email Address"
                    type="email"
                    placeholder="e.g. yourname@domain.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    leftIcon={<Icon name="mail" size={18} />}
                  />
                </div>

                <div className={s.fieldGroup}>
                  <Input
                    label="Official Phone (Optional)"
                    type="tel"
                    placeholder="e.g. 9811223344 (Optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={<Icon name="call" size={18} />}
                  />
                </div>
              </div>

              <div className={s.fieldGroup}>
                <Input
                  label="Master Security Passkey"
                  type="text"
                  placeholder="CIVICSETU-ADMIN-2025"
                  value={securityKey}
                  onChange={(e) => setSecurityKey(e.target.value)}
                  required
                  leftIcon={<Icon name="key" size={18} />}
                />
              </div>

              <div className={s.fieldGroup}>
                <Input
                  label="Designation / Official Title"
                  type="text"
                  placeholder="e.g. Municipal Commissioner / System Administrator"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  leftIcon={<Icon name="badge" size={18} />}
                />
              </div>

              <div className={s.formRow}>
                <div className={s.fieldGroup}>
                  <Input
                    label="Set Administrator Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    leftIcon={<Icon name="lock" size={18} />}
                  />
                </div>

                <div className={s.fieldGroup}>
                  <Input
                    label="Confirm Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    leftIcon={<Icon name="lock_reset" size={18} />}
                  />
                </div>
              </div>

              <label className={s.termsCheckbox}>
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  required
                />
                <span>
                  I acknowledge executive fiduciary duty and agree to the CivicSetu Master Administrative Governance Protocol.
                </span>
              </label>

              <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={loading}
                rightIcon={<Icon name="arrow_forward" size={18} />}
                className={s.submitBtn}
                style={{ backgroundColor: '#6366f1' }}
              >
                Provision Super Administrator
              </Button>
            </form>

            <div className={s.footerText} style={{ marginTop: '16px' }}>
              Already have Super Admin credentials?{' '}
              <Link to="/login/superadmin" className={s.signupLink} style={{ color: '#6366f1' }}>
                Admin Terminal Login
              </Link>
            </div>

            {/* Other Portals Switcher */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px' }}>
              <Link to="/signup/citizen" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="person" size={14} />
                <span>Citizen Registration</span>
              </Link>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Link to="/signup/authority" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="badge" size={14} />
                <span>Authority Registration</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSignup;
