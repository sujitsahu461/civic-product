import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import ArithmeticCaptcha from '../components/auth/ArithmeticCaptcha';
import s from './Login.module.css';

export const CitizenLogin: React.FC = () => {
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
    setEmail('citizen@civicsetu.gov.in');
    setPassword('Citizen@12345');
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
      setFormError('Please enter your email and password.');
      return;
    }

    if (!isCaptchaValid) {
      setFormError('Please solve the arithmetic security calculation correctly.');
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

      success(`Welcome back, ${user.full_name || 'Citizen'}!`);

      if (user.role === 'SUPER_ADMIN') {
        navigate('/superadmin/dashboard');
      } else if (user.role === 'AUTHORITY') {
        navigate('/authority/dashboard');
      } else {
        navigate('/citizen/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setFormError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.authCard}>
        {/* Left Visual Panel: Citizen Environmental Identity */}
        <div className={s.leftPanel}>
          <div className={s.leftGlow} />

          <div className={s.visualTopRow}>
            <Link to="/" className={s.brandHeader} style={{ textDecoration: 'none' }}>
              <div className={s.brandLogo}>
                <img src="/logo-mark.png" alt="CivicSetu" className={s.brandLogoImg} />
              </div>
              <div className={s.brandMeta}>
                <span className={s.brandName}>CivicSetu</span>
                <span className={s.brandBadge}>CITIZEN PORTAL</span>
              </div>
            </Link>

            <div className={s.sealWrapper}>
              <span style={{ fontSize: '28px' }}>🌱</span>
            </div>
          </div>

          <div className={s.visualBody}>
            <div className={s.visualTagline}>
              <span className={s.taglineDot} />
              <span>Voice for Every Citizen</span>
            </div>

            <h1 className={s.editorialHeading}>
              Lodge Complaints.<br />
              Track in Real-Time.<br />
              Verify Resolution.
            </h1>

            <p className={s.editorialSubheading}>
              Empowering residents with AI triage, direct department routing, and complete lifecycle accountability for municipal civic issues.
            </p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                ✓ AI Auto-Categorization
              </span>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                ✓ Live GIS Radar
              </span>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                ✓ Citizen Rating & Review
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
            <div className={s.headerContent}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                <Icon name="person" size={14} />
                <span>Citizen Sign In</span>
              </div>
              <h2 className={s.formTitle}>Citizen Portal Login</h2>
              <p className={s.formSubtitle}>
                Enter your credentials to view your grievance history and lodge new reports.
              </p>
            </div>

            {/* Quick Demo Fill Pill */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="bolt" size={18} style={{ color: '#16a34a' }} />
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Test Citizen Account:</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
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
                  label="Citizen Email Address"
                  type="email"
                  placeholder="e.g. aarav@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={<Icon name="mail" size={18} />}
                />
              </div>

              <div className={s.fieldGroup}>
                <Input
                  label="Password"
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
                  <span>Remember me</span>
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
                style={{ backgroundColor: '#16a34a' }}
              >
                Sign In as Citizen
              </Button>
            </form>

            <div className={s.footerText} style={{ marginTop: '16px' }}>
              Don't have a citizen account?{' '}
              <Link to="/signup/citizen" className={s.signupLink} style={{ color: '#16a34a' }}>
                Register as Citizen
              </Link>
            </div>

            {/* Other Portals Switcher */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px' }}>
              <Link to="/login/authority" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="badge" size={14} />
                <span>Authority Login</span>
              </Link>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Link to="/login/superadmin" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="admin_panel_settings" size={14} />
                <span>Super Admin Login</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenLogin;
