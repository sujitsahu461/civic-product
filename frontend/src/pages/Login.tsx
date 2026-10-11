import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import authService from '../services/auth.service';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import ArithmeticCaptcha from '../components/auth/ArithmeticCaptcha';
import s from './Login.module.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [roleTab, setRoleTab] = useState<'CITIZEN' | 'AUTHORITY' | 'SUPER_ADMIN'>('CITIZEN');
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

  const handleCaptchaVerify = useCallback((key: string, code: string, isValid: boolean) => {
    setCaptchaKey(key);
    setCaptchaCode(code);
    setIsCaptchaValid(isValid);
  }, []);

  const handleQuickFill = (role: 'CITIZEN' | 'AUTHORITY' | 'SUPER_ADMIN') => {
    setRoleTab(role);
    setFormError('');
    if (role === 'CITIZEN') {
      setEmail('citizen@civicsetu.gov.in');
      setPassword('Citizen@12345');
    } else if (role === 'AUTHORITY') {
      setEmail('officer@civicsetu.gov.in');
      setPassword('Officer@12345');
    } else {
      setEmail('admin@civicsetu.gov.in');
      setPassword('Admin@12345');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    if (!isCaptchaValid) {
      setFormError('Please solve the arithmetic security problem correctly.');
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
      success(`Welcome back, ${user.full_name || 'User'}!`);

      if (user.role === 'SUPER_ADMIN') {
        navigate('/superadmin/dashboard');
      } else if (user.role === 'AUTHORITY') {
        navigate('/authority/dashboard');
      } else {
        navigate('/citizen/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || err.captcha_code || 'Email or password is incorrect. Please check your credentials.';
      setFormError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.authCard}>
        {/* Left Visual Panel: Environmental Civic Identity */}
        <div className={s.leftPanel}>
          <div className={s.leftGlow}></div>

          {/* Top Row: Brand & Editorial Seal */}
          <div className={s.visualTopRow}>
            <div className={s.brandHeader}>
              <div className={s.brandLogo}>
                <img src="/logo-mark.png" alt="CivicSetu Logo" className={s.brandLogoImg} />
              </div>
              <div className={s.brandMeta}>
                <span className={s.brandName}>CivicSetu</span>
                <span className={s.brandBadge}>CIVIC INTELLIGENCE</span>
              </div>
            </div>

            {/* Circular Stamp Badge */}
            <div className={s.sealWrapper}>
              <svg viewBox="0 0 110 110" className={s.circularSeal} aria-hidden="true">
                <path
                  id="sealPath"
                  d="M 55, 55 m -40, 0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0"
                  fill="none"
                />
                <circle cx="55" cy="55" r="50" stroke="#24451F" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.4" />
                <circle cx="55" cy="55" r="34" stroke="#24451F" strokeWidth="0.8" fill="none" opacity="0.3" />
                <text fill="#24451F" fontSize="8.5" fontWeight="700" letterSpacing="2.2">
                  <textPath href="#sealPath" startOffset="0%">
                    FOR OUR CITIES • FOR OUR CITIZENS •
                  </textPath>
                </text>
                <g transform="translate(55, 55) scale(0.85)">
                  <path d="M0,8 C-7,1 -7,-8 0,-14 C7,-8 7,1 0,8 Z" fill="#24451F" />
                  <path d="M0,0 C-9,-2 -10,-10 -5,-14 C-2,-10 0,-3 0,0 Z" fill="#4F8F4A" />
                  <path d="M0,0 C9,-2 10,-10 5,-14 C2,-10 0,-3 0,0 Z" fill="#4F8F4A" />
                  <circle cx="0" cy="8.5" r="1.5" fill="#24451F" />
                </g>
              </svg>
            </div>
          </div>

          {/* Editorial Content */}
          <div className={s.visualBody}>
            <div className={s.visualTagline}>
              <span className={s.taglineDot}></span>
              <span>Small reports. Meaningful change.</span>
            </div>

            <h1 className={s.editorialHeading}>
              Connecting Citizens.<br />
              Improving Communities.
            </h1>

            <p className={s.editorialSubheading}>
              Technology working together with communities to create cleaner, safer, and sustainable places to live.
            </p>

            {/* Pristine Human & Nature Hands Illustration */}
            <div className={s.handsVisualContainer}>
              <img
                src="/civic-hands-clean.png"
                alt="Citizens and Nature working together in harmony"
                className={s.handsVisualImg}
              />
            </div>

            {/* Civic Pillars */}
            <div className={s.civicPills}>
              <span className={s.civicPill}>Clean Roads</span>
              <span className={s.civicPill}>Safe Water</span>
              <span className={s.civicPill}>Sanitation</span>
              <span className={s.civicPill}>Green Spaces</span>
              <span className={s.civicPill}>Public Safety</span>
            </div>
          </div>

          {/* Minimal Footer */}
          <div className={s.visualFooter}>
            <span>National Civic Grievance & Urban Governance Platform © 2026</span>
          </div>
        </div>

        {/* Right Panel: Clean Authentication Form */}
        <div className={s.rightPanel}>
          <div className={s.formWrapper}>
            <div className={s.formHeader}>
              <div className={s.badgeRow}>
                <span className={s.portalBadge}>
                  {roleTab === 'SUPER_ADMIN'
                    ? 'SUPER ADMIN PORTAL'
                    : roleTab === 'AUTHORITY'
                    ? 'MUNICIPAL OFFICER PORTAL'
                    : 'CITIZEN PORTAL'}
                </span>
              </div>
              <h2 className={s.title}>Welcome back</h2>
              <p className={s.subtitle}>
                Sign in to report civic issues, track your complaints, and help improve your community.
              </p>
            </div>

            {/* 1-Click Quick Demo Pill Box */}
            <div className={s.quickDemoBox}>
              <span className={s.quickDemoLabel}>⚡ 1-Click Demo:</span>
              <div className={s.quickDemoButtons}>
                <button
                  type="button"
                  className={`${s.quickBtn} ${roleTab === 'CITIZEN' ? s.quickBtnActive : ''}`}
                  onClick={() => handleQuickFill('CITIZEN')}
                >
                  Citizen
                </button>
                <button
                  type="button"
                  className={`${s.quickBtn} ${roleTab === 'AUTHORITY' ? s.quickBtnActive : ''}`}
                  onClick={() => handleQuickFill('AUTHORITY')}
                >
                  Officer
                </button>
                <button
                  type="button"
                  className={`${s.quickBtn} ${roleTab === 'SUPER_ADMIN' ? s.quickBtnActive : ''}`}
                  onClick={() => handleQuickFill('SUPER_ADMIN')}
                >
                  Admin
                </button>
              </div>
            </div>

            {formError && (
              <div className={s.errorBanner}>
                <Icon name="error" size={18} />
                <span>{formError}</span>
              </div>
            )}

            {/* Login Form */}
            <form className={s.form} onSubmit={handleSubmit}>
              <div className={s.fieldGroup}>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="e.g. resident@example.com"
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

              {/* Arithmetic Captcha Security Challenge */}
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
              >
                Sign In
              </Button>
            </form>

            <div className={s.footerText}>
              Don't have an account?{' '}
              <Link to="/signup/citizen" className={s.signupLink}>
                Create an account
              </Link>
            </div>

            {/* Separate Dedicated Portals */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Dedicated Role Portals:
              </span>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
                <Link to="/login/citizen" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
                  🌱 Citizen
                </Link>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <Link to="/login/authority" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                  🏛️ Authority
                </Link>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <Link to="/login/superadmin" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
                  🛡️ Super Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
