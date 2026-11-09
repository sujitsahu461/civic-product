import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import ArithmeticCaptcha from '../components/auth/ArithmeticCaptcha';
import s from './Login.module.css';

export const AuthorityLogin: React.FC = () => {
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
    setEmail('officer@civicsetu.gov.in');
    setPassword('Officer@12345');
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
      setFormError('Please enter your official email and password.');
      return;
    }

    if (!isCaptchaValid) {
      setFormError('Please solve the arithmetic security verification correctly.');
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

      success(`Welcome Officer, ${user.full_name || 'Authority'}!`);

      if (user.role === 'SUPER_ADMIN') {
        navigate('/superadmin/dashboard');
      } else if (user.role === 'AUTHORITY') {
        navigate('/authority/dashboard');
      } else {
        navigate('/citizen/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please verify your officer credentials.';
      setFormError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.authCard}>
        {/* Left Visual Panel: Municipal Authority Identity */}
        <div className={s.leftPanel} style={{ background: 'linear-gradient(165deg, #FFF4EC 0%, #FFE8D6 55%, #FFC9A3 100%)' }}>
          <div className={s.leftGlow} style={{ background: 'radial-gradient(circle, rgba(255, 119, 34, 0.15) 0%, transparent 70%)' }} />

          <div className={s.visualTopRow}>
            <Link to="/" className={s.brandHeader} style={{ textDecoration: 'none' }}>
              <div className={s.brandLogo}>
                <img src="/logo-mark.png" alt="CivicSetu" className={s.brandLogoImg} />
              </div>
              <div className={s.brandMeta}>
                <span className={s.brandName}>CivicSetu</span>
                <span className={s.brandBadge} style={{ background: '#FFE8D6', color: '#7A1F2B' }}>AUTHORITY DESK</span>
              </div>
            </Link>

            <div className={s.sealWrapper}>
              <span style={{ fontSize: '28px' }}>🏛️</span>
            </div>
          </div>

          <div className={s.visualBody}>
            <div className={s.visualTagline}>
              <span className={s.taglineDot} style={{ background: '#FF7722' }} />
              <span>Municipal Redressal Command</span>
            </div>

            <h1 className={s.editorialHeading} style={{ color: '#3B2418' }}>
              Department Queues.<br />
              Dispatch & Action.<br />
              SLA Commitments.
            </h1>

            <p className={s.editorialSubheading} style={{ color: '#5A4033' }}>
              Official administrative console for zonal engineers, health inspectors, and municipal officers to resolve civic grievances with photographic proof.
            </p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.75)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#7A1F2B' }}>
                ✓ Department-Scoped Queues
              </span>
              <span style={{ background: 'rgba(255,255,255,0.75)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#7A1F2B' }}>
                ✓ Strict State Machine
              </span>
              <span style={{ background: 'rgba(255,255,255,0.75)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#7A1F2B' }}>
                ✓ Mandatory Resolution Proof
              </span>
            </div>
          </div>

          <div className={s.visualFooter}>
            <Link to="/" style={{ color: '#7A1F2B', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              ← Return to Main Homepage
            </Link>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className={s.rightPanel}>
          <div className={s.formWrapper}>
            <div className={s.headerContent}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFE8D6', color: '#7A1F2B', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                <Icon name="badge" size={14} />
                <span>Nodal Officer Sign In</span>
              </div>
              <h2 className={s.formTitle}>Municipal Authority Login</h2>
              <p className={s.formSubtitle}>
                Sign in with your official municipal credentials to access grievance triage and dispatch.
              </p>
            </div>

            {/* Quick Demo Fill Pill */}
            <div style={{ background: '#FFFBF2', border: '1px solid #EADFCB', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="bolt" size={18} style={{ color: '#7A1F2B' }} />
                <span style={{ fontSize: '12px', color: '#5A4033', fontWeight: 600 }}>Official Officer Account:</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                style={{ background: '#FFE8D6', color: '#7A1F2B', border: '1px solid #FFC9A3', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
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
                  label="Official Government / ULB Email"
                  type="email"
                  placeholder="e.g. officer@civicsetu.gov.in"
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
                  <span>Remember session</span>
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
                style={{ backgroundColor: '#FF7722' }}
              >
                Sign In as Authority
              </Button>
            </form>

            <div className={s.footerText} style={{ marginTop: '16px' }}>
              Need an officer account?{' '}
              <Link to="/signup/authority" className={s.signupLink} style={{ color: '#7A1F2B' }}>
                See how to get one
              </Link>
            </div>

            {/* Other Portals Switcher */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F7EFE1', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px' }}>
              <Link to="/login/citizen" style={{ color: '#2E7D4F', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="person" size={14} />
                <span>Citizen Login</span>
              </Link>
              <span style={{ color: '#DCCDB5' }}>•</span>
              <Link to="/login/superadmin" style={{ color: '#7A1F2B', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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

export default AuthorityLogin;
