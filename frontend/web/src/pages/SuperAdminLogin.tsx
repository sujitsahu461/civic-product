import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import ArithmeticCaptcha from '../components/auth/ArithmeticCaptcha';
import s from './Login.module.css';

export const SuperAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Arithmetic Captcha state
  const [captchaKey, setCaptchaKey] = useState('local');
  const [captchaCode, setCaptchaCode] = useState('');
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);

  const handleQuickFill = () => {
    setEmail('admin@civicsetu.gov.in');
    setPassword('Admin@12345');
    setFormError('');
  };

  const handleCaptchaVerify = useCallback((key: string, code: string, isValid: boolean) => {
    setCaptchaKey(key);
    setCaptchaCode(code);
    setIsCaptchaValid(isValid);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please enter administrator credentials.');
      return;
    }

    if (!isCaptchaValid) {
      setFormError('Please solve the arithmetic security challenge correctly.');
      return;
    }

    setLoading(true);

    try {
      const user = await login({
        email,
        password,
        captcha_key: captchaKey,
        captcha_code: captchaCode,
      });

      if (user.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied: This portal requires Super Administrator privileges.');
      }

      success(`Welcome Administrator, ${user.full_name || 'Admin'}!`);
      navigate('/superadmin/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Administrator authorization failed.';
      setFormError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.authCard} style={{ borderColor: '#DCCDB5' }}>
        {/* Left Visual Panel: Super Admin High-Security Terminal */}
        <div className={s.leftPanel} style={{ background: 'linear-gradient(165deg, #3B2418 0%, #5E1620 55%, #7A1F2B 100%)', color: '#FFFBF2' }}>
          <div className={s.leftGlow} style={{ background: 'radial-gradient(circle, rgba(122, 31, 43, 0.25) 0%, transparent 70%)' }} />

          <div className={s.visualTopRow}>
            <Link to="/" className={s.brandHeader} style={{ textDecoration: 'none' }}>
              <div className={s.brandLogo} style={{ background: '#3B2418', borderColor: '#5A4033' }}>
                <img src="/logo-mark.png" alt="CivicSetu" className={s.brandLogoImg} />
              </div>
              <div className={s.brandMeta}>
                <span className={s.brandName} style={{ color: '#FFFFFF' }}>CivicSetu</span>
                <span className={s.brandBadge} style={{ background: '#7A1F2B', color: '#FFE8D6', borderColor: '#A33B4A' }}>
                  CENTRAL COMMAND
                </span>
              </div>
            </Link>

            <div className={s.sealWrapper}>
              <span style={{ fontSize: '28px' }}>🛡️</span>
            </div>
          </div>

          <div className={s.visualBody}>
            <div className={s.visualTagline}>
              <span className={s.taglineDot} style={{ background: '#7A1F2B' }} />
              <span style={{ color: '#DCCDB5' }}>Executive Administration</span>
            </div>

            <h1 className={s.editorialHeading} style={{ color: '#FFFFFF' }}>
              System Command.<br />
              Nodal Governance.<br />
              Total Telemetry.
            </h1>

            <p className={s.editorialSubheading} style={{ color: 'rgba(255, 251, 242, 0.75)' }}>
              Master administrative control panel for municipal commissioners, system overseers, and audit directors across all ULB jurisdictions.
            </p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#E4BCC1', border: '1px solid rgba(255,255,255,0.15)' }}>
                ✓ Department Configuration
              </span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#E4BCC1', border: '1px solid rgba(255,255,255,0.15)' }}>
                ✓ Officer Access Control
              </span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#E4BCC1', border: '1px solid rgba(255,255,255,0.15)' }}>
                ✓ Immutable Security Audit Trail
              </span>
            </div>
          </div>

          <div className={s.visualFooter}>
            <Link to="/" style={{ color: '#E4BCC1', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              ← Return to Main Homepage
            </Link>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className={s.rightPanel}>
          <div className={s.formWrapper}>
            <div className={s.headerContent}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F6E3E5', color: '#7A1F2B', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                <Icon name="admin_panel_settings" size={14} />
                <span>Super Administrator Gateway</span>
              </div>
              <h2 className={s.formTitle}>Super Admin Login</h2>
              <p className={s.formSubtitle}>
                Restricted access. Authenticate with root municipal credentials to enter command mode.
              </p>
            </div>

            {/* Quick Demo Fill Pill */}
            <div style={{ background: '#FFFBF2', border: '1px solid #EADFCB', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="bolt" size={18} style={{ color: '#7A1F2B' }} />
                <span style={{ fontSize: '12px', color: '#5A4033', fontWeight: 600 }}>Super Admin Demo:</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                style={{ background: '#F6E3E5', color: '#7A1F2B', border: '1px solid #E4BCC1', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                1-Click Fill Demo
              </button>
            </div>

            {formError && (
              <div className={s.errorBanner}>
                <Icon name="error" size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form className={s.form} onSubmit={handleSubmit}>
              <div className={s.fieldGroup}>
                <Input
                  label="Master Admin Email"
                  type="email"
                  placeholder="e.g. admin@civicsetu.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={<Icon name="mail" size={18} />}
                />
              </div>

              <div className={s.fieldGroup}>
                <Input
                  label="Administrator Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
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

              {/* Arithmetic Captcha Component */}
              <ArithmeticCaptcha onVerify={handleCaptchaVerify} required />

              <div className={s.formUtils}>
                <label className={s.rememberLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={s.checkbox}
                  />
                  <span>Elevated session</span>
                </label>

                <Link
                  to={email ? `/reset-password?email=${encodeURIComponent(email)}` : '/reset-password'}
                  className={s.forgotBtn}
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={loading}
                rightIcon={<Icon name="arrow_forward" size={18} />}
                className={s.submitBtn}
                style={{ backgroundColor: '#7A1F2B' }}
              >
                Authenticate Terminal
              </Button>
            </form>

            <div className={s.footerText} style={{ marginTop: '16px' }}>
              Need to provision a Super Admin key?{' '}
              <Link to="/signup/superadmin" className={s.signupLink} style={{ color: '#7A1F2B' }}>
                Admin Setup & Registration
              </Link>
            </div>

            {/* Other Portals Switcher */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F7EFE1', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px' }}>
              <Link to="/login/citizen" style={{ color: '#2E7D4F', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="person" size={14} />
                <span>Citizen Login</span>
              </Link>
              <span style={{ color: '#DCCDB5' }}>•</span>
              <Link to="/login/authority" style={{ color: '#7A1F2B', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="badge" size={14} />
                <span>Authority Login</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
