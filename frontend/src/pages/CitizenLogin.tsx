import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import ArithmeticCaptcha from '../components/auth/ArithmeticCaptcha';
import LanguageSelector from '../components/ui/LanguageSelector';
import s from './Login.module.css';

export const CitizenLogin: React.FC = () => {
  const { t } = useTranslation();
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
      setFormError(t('auth.login.errMissing'));
      return;
    }

    if (!isCaptchaValid) {
      setFormError(t('auth.login.errCaptcha'));
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

      success(t('auth.login.welcomeBack', { name: user.full_name || t('layout.citizenFallback') }));

      if (user.role === 'SUPER_ADMIN') {
        navigate('/superadmin/dashboard');
      } else if (user.role === 'AUTHORITY') {
        navigate('/authority/dashboard');
      } else {
        navigate('/citizen/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || t('auth.login.errFailed');
      setFormError(msg);
      toastError(msg);
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
                <img src="/logo-mark.png" alt={t('landing.logoAlt')} className={s.brandLogoImg} />
              </div>
              <div className={s.brandMeta}>
                <span className={s.brandName}>CivicSetu</span>
                <span className={s.brandBadge}>{t('auth.login.portalBadge')}</span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <LanguageSelector />
              <div className={s.sealWrapper}>
                <span style={{ fontSize: '24px' }}>🌿</span>
              </div>
            </div>
          </div>

          <div className={s.visualBody}>
            <div className={s.visualTagline}>
              <span className={s.taglineDot} />
              <span>{t('auth.login.tagline')}</span>
            </div>

            <h1 className={s.editorialHeading}>
              {t('auth.login.headingLine1')}<br />
              {t('auth.login.headingLine2')}<br />
              {t('auth.login.headingLine3')}
            </h1>

            <p className={s.editorialSubheading}>
              {t('auth.login.subheading')}
            </p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1F6B3F' }}>
                {t('auth.login.chipMultilingual')}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1F6B3F' }}>
                {t('auth.login.chipEvidence')}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1F6B3F' }}>
                {t('auth.login.chipTracking')}
              </span>
            </div>
          </div>

          <div className={s.visualFooter}>
            <Link to="/" style={{ color: '#1F6B3F', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {t('auth.common.returnHome')}
            </Link>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className={s.rightPanel}>
          <div className={s.formWrapper}>
            <div className={s.headerContent}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#E6F4EA', color: '#1F6B3F', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                <Icon name="person" size={14} />
                <span>{t('auth.citizenLoginTitle')}</span>
              </div>
              <h2 className={s.formTitle}>{t('auth.citizenLoginTitle')}</h2>
              <p className={s.formSubtitle}>
                {t('auth.citizenLoginSubtitle')}
              </p>
            </div>

            {/* Quick Demo Fill Pill */}
            <div style={{ background: '#FFFBF2', border: '1px solid #EADFCB', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="bolt" size={18} style={{ color: '#2E7D4F' }} />
                <span style={{ fontSize: '12px', color: '#5A4033', fontWeight: 600 }}>{t('auth.login.testAccount')}</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                style={{ background: '#E6F4EA', color: '#1F6B3F', border: '1px solid #B7DEC3', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                {t('auth.login.quickFill')}
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
                  label={t('auth.emailLabel')}
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={<Icon name="mail" size={18} />}
                />
              </div>

              <div className={s.fieldGroup}>
                <Input
                  label={t('auth.passwordLabel')}
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
                      aria-label={showPassword ? t('auth.common.hidePassword') : t('auth.common.showPassword')}
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
                  <span>{t('auth.login.rememberMe')}</span>
                </label>

                <Link
                  to={email ? `/reset-password?email=${encodeURIComponent(email)}` : '/reset-password'}
                  className={s.forgotBtn}
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={loading}
                rightIcon={<Icon name="arrow_forward" size={18} />}
                className={s.submitBtn}
                style={{ backgroundColor: '#2E7D4F' }}
              >
                {t('auth.loginButton')}
              </Button>
            </form>

            <div className={s.footerText} style={{ marginTop: '16px' }}>
              {t('auth.noAccount')}{' '}
              <Link to="/signup/citizen" className={s.signupLink} style={{ color: '#2E7D4F' }}>
                {t('auth.registerLink')}
              </Link>
            </div>

            {/* Other Portals Switcher */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F7EFE1', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px' }}>
              <Link to="/login/authority" style={{ color: '#7A1F2B', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="badge" size={14} />
                <span>{t('nav.authorityPortal')}</span>
              </Link>
              <span style={{ color: '#DCCDB5' }}>•</span>
              <Link to="/login/superadmin" style={{ color: '#7A1F2B', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="admin_panel_settings" size={14} />
                <span>{t('nav.adminPortal')}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenLogin;
