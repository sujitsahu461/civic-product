import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import s from './Login.module.css';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, forgotPassword } = useAuthStore();
  const { success, error: toastError } = useToast();

  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  // Step 1: enter email to find account, Step 2: set new password
  const hasResetToken = !!(uid && token);
  const [step, setStep] = useState<'email' | 'password'>(hasResetToken || emailParam ? 'password' : 'email');
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [generatedResetUrl, setGeneratedResetUrl] = useState('');

  const handleSendEmailLink = async () => {
    if (!email.trim()) {
      setFormError('Please enter your registered email address first.');
      return;
    }
    setFormError('');
    setSendingLink(true);
    try {
      const res: any = await forgotPassword(email.trim());
      setEmailLinkSent(true);
      if (res?.reset_url) {
        setGeneratedResetUrl(res.reset_url);
      }
      success('Password reset request processed! Check your email or use the link below.');
    } catch (err: any) {
      let msg = 'Failed to dispatch reset email.';
      if (err.message) msg = err.message;
      if (err.response?.data?.detail) msg = err.response.data.detail;
      setFormError(msg);
      toastError(msg);
    } finally {
      setSendingLink(false);
    }
  };

  const handleEmailStep = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!email.trim()) {
      setFormError('Please enter your registered email address.');
      return;
    }
    setStep('password');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() && (!uid || !token)) {
      setFormError('Please enter your registered account email address.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('New password and confirm password do not match.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        email: email.trim() || undefined,
        uid: uid || undefined,
        token: token || undefined,
        new_password: password,
      });

      setIsDone(true);
      success('Password successfully reset! You can now log in with your new password.');
    } catch (err: any) {
      let msg = 'Failed to reset password. Please check your registered email address.';
      if (err.message) {
        msg = err.message;
      }
      const data = err.response?.data;
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.detail) msg = data.detail;
        else if (data.email) msg = Array.isArray(data.email) ? data.email[0] : data.email;
        else if (data.new_password) msg = Array.isArray(data.new_password) ? data.new_password[0] : data.new_password;
        else if (data.non_field_errors) msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
        else if (data.message) msg = data.message;
      }
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      toastError(typeof msg === 'string' ? msg : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.authCard}>
        {/* Left Visual Panel */}
        <div className={s.leftPanel}>
          <div className={s.leftGlow} />

          <div className={s.visualTopRow}>
            <Link to="/" className={s.brandHeader} style={{ textDecoration: 'none' }}>
              <div className={s.brandLogo}>
                <img src="/logo-mark.png" alt="CivicSetu" className={s.brandLogoImg} />
              </div>
              <div className={s.brandMeta}>
                <span className={s.brandName}>CivicSetu</span>
                <span className={s.brandBadge}>SECURITY & RECOVERY</span>
              </div>
            </Link>

            <div className={s.sealWrapper}>
              <span style={{ fontSize: '28px' }}>🔒</span>
            </div>
          </div>

          <div className={s.visualBody}>
            <div className={s.visualTagline}>
              <span className={s.taglineDot} />
              <span>Secure Identity & Access Recovery</span>
            </div>

            <h1 className={s.editorialHeading}>
              Account Security<br />
              & Password Reset.
            </h1>

            <p className={s.editorialSubheading}>
              Direct digital credential update for CivicSetu users. Enter your registered account email and set your new password to regain access instantly.
            </p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                ✓ Instant Reset
              </span>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                ✓ 256-bit Encryption
              </span>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                ✓ Zero Wait
              </span>
            </div>
          </div>

          <div className={s.visualFooter}>
            <Link to="/" style={{ color: '#166534', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              ← Return to Main Homepage
            </Link>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className={s.rightPanel}>
          <div className={s.formWrapper}>
            <div className={s.formHeader}>
              <div className={s.badgeRow}>
                <span className={s.portalBadge}>PASSWORD RECOVERY</span>
              </div>
              <h2 className={s.title}>Reset Your Password</h2>
              <p className={s.subtitle}>
                Enter your registered email and choose a strong new password to regain access to your account.
              </p>
            </div>

            {isDone ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                  fontSize: '28px', color: '#16a34a'
                }}>
                  ✓
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Password Updated Successfully!
                </h4>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>
                  Your password has been updated in the system. You can now sign in to your dashboard with your new credentials.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/login/citizen')}
                  rightIcon={<Icon name="arrow_forward" size={18} />}
                  className={s.submitBtn}
                  style={{ marginTop: '8px' }}
                >
                  Proceed to Sign In
                </Button>
              </div>
            ) : step === 'email' ? (
              <>
                {formError && (
                  <div className={s.errorBanner}>
                    <Icon name="error" size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                <form className={s.form} onSubmit={handleEmailStep}>
                  <div className={s.fieldGroup}>
                    <Input
                      label="Registered Email Address"
                      type="email"
                      placeholder="e.g. yourname@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      leftIcon={<Icon name="mail" size={18} />}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    rightIcon={<Icon name="arrow_forward" size={18} />}
                    className={s.submitBtn}
                  >
                    Continue to Set New Password
                  </Button>

                  <div style={{ textAlign: 'center', margin: '14px 0 6px 0', fontSize: '12px', color: '#94a3b8' }}>
                    ── OR ──
                  </div>

                  <button
                    type="button"
                    onClick={handleSendEmailLink}
                    disabled={sendingLink}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Icon name="mail" size={16} />
                    <span>{sendingLink ? 'Dispatching link...' : 'Email Me a Secure Reset Link'}</span>
                  </button>
                </form>

                {emailLinkSent && (
                  <div style={{
                    marginTop: '16px',
                    padding: '14px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: '#15803d'
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>✓ Reset Request Dispatched!</div>
                    <p style={{ margin: '0 0 8px 0', color: '#166534', lineHeight: 1.5 }}>
                      If an active account exists for <strong>{email}</strong>, a secure password reset link has been processed.
                    </p>
                    {generatedResetUrl && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857' }}>DEV MODE DIRECT RESET LINK:</span>
                        <a
                          href={generatedResetUrl}
                          style={{
                            display: 'block',
                            marginTop: '4px',
                            wordBreak: 'break-all',
                            color: '#2563eb',
                            textDecoration: 'underline',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          {generatedResetUrl}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className={s.footerText} style={{ marginTop: 24 }}>
                  Remember your credentials?{' '}
                  <Link to="/login/citizen" className={s.signupLink}>
                    Back to Sign In
                  </Link>
                </div>
              </>
            ) : (
              <>
                {formError && (
                  <div className={s.errorBanner}>
                    <Icon name="error" size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Show which email we're resetting for */}
                {email && (
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '10px 14px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon name="mail" size={18} style={{ color: '#16a34a' }} />
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>{email}</span>
                    </div>
                    {!hasResetToken && (
                      <button
                        type="button"
                        onClick={() => { setStep('email'); setFormError(''); }}
                        style={{
                          background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                          padding: '4px 10px', borderRadius: '8px', fontSize: '12px',
                          fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Change Email
                      </button>
                    )}
                  </div>
                )}

                <form className={s.form} onSubmit={handleSubmit}>
                  <div className={s.fieldGroup}>
                    <Input
                      label="New Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password (min 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      leftIcon={<Icon name="lock" size={18} />}
                      rightIcon={
                        <button
                          type="button"
                          className={s.iconToggleBtn}
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                        </button>
                      }
                    />
                  </div>

                  <div className={s.fieldGroup}>
                    <Input
                      label="Confirm New Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      leftIcon={<Icon name="lock" size={18} />}
                      rightIcon={
                        <button
                          type="button"
                          className={s.iconToggleBtn}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          <Icon name={showConfirmPassword ? 'visibility_off' : 'visibility'} size={18} />
                        </button>
                      }
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    isLoading={loading}
                    rightIcon={<Icon name="arrow_forward" size={18} />}
                    className={s.submitBtn}
                  >
                    Update Password Now
                  </Button>
                </form>

                <div className={s.footerText} style={{ marginTop: 24 }}>
                  Remember your credentials?{' '}
                  <Link to="/login/citizen" className={s.signupLink}>
                    Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
