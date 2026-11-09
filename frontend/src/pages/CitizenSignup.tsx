import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import LanguageSelector from '../components/ui/LanguageSelector';
import s from './Login.module.css';

export const CitizenSignup: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Compute password strength score (0 to 4)
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['weak', 'fair', 'good', 'strong', 'excellent'].map((k) => t(`auth.signup.strength.${k}`));
  const strengthColors = ['#B42318', '#FF7722', '#F4C430', '#2E7D4F', '#1F6B3F'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!termsAgreed) {
      setFormError(t('auth.signup.errTerms'));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t('auth.signup.errMismatch'));
      return;
    }

    if (password.length < 8) {
      setFormError(t('auth.common.passwordMinLength'));
      return;
    }

    setLoading(true);

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        role: 'CITIZEN',
        address: address.trim() || undefined,
      });

      success(t('auth.signup.success', { name: fullName }));
      navigate('/citizen/dashboard');
    } catch (err: any) {
      const msg = err.message || t('auth.signup.errFailed');
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
                <span className={s.brandBadge}>{t('auth.signup.portalBadge')}</span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <LanguageSelector />
              <div className={s.sealWrapper}>
                <span style={{ fontSize: '24px' }}>🌱</span>
              </div>
            </div>
          </div>

          <div className={s.visualBody}>
            <div className={s.visualTagline}>
              <span className={s.taglineDot} />
              <span>{t('auth.signup.tagline')}</span>
            </div>

            <h1 className={s.editorialHeading}>
              {t('auth.signup.headingLine1')}<br />
              {t('auth.signup.headingLine2')}<br />
              {t('auth.signup.headingLine3')}
            </h1>

            <p className={s.editorialSubheading}>
              {t('auth.signup.subheading')}
            </p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1F6B3F' }}>
                {t('auth.signup.chipPortal')}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1F6B3F' }}>
                {t('auth.signup.chipEvidence')}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1F6B3F' }}>
                {t('auth.signup.chipVerification')}
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
                <Icon name="person_add" size={14} />
                <span>{t('auth.citizenSignupTitle')}</span>
              </div>
              <h2 className={s.formTitle}>{t('auth.citizenSignupTitle')}</h2>
              <p className={s.formSubtitle}>
                {t('auth.citizenSignupSubtitle')}
              </p>
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
                  label={t('auth.fullNameLabel')}
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  leftIcon={<Icon name="person" size={18} />}
                />
              </div>

              <div className={s.formRow}>
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
                    label={t('auth.phoneLabel')}
                    type="tel"
                    placeholder={t('auth.phonePlaceholder')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={<Icon name="call" size={18} />}
                  />
                </div>
              </div>

              <div className={s.fieldGroup}>
                <Input
                  label={t('auth.addressLabel')}
                  type="text"
                  placeholder={t('auth.addressPlaceholder')}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  leftIcon={<Icon name="location_on" size={18} />}
                />
              </div>

              <div className={s.formRow}>
                <div className={s.fieldGroup}>
                  <Input
                    label={t('auth.passwordLabel')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.signup.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    leftIcon={<Icon name="lock" size={18} />}
                  />
                </div>

                <div className={s.fieldGroup}>
                  <Input
                    label={t('auth.signup.confirmLabel')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.signup.confirmPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    leftIcon={<Icon name="lock_reset" size={18} />}
                  />
                </div>
              </div>

              {/* Password strength */}
              {password && (
                <div className={s.strengthMeter}>
                  <div className={s.strengthBar}>
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={s.strengthSegment}
                        style={{
                          backgroundColor: strength >= level ? strengthColors[strength] : '#EADFCB',
                        }}
                      />
                    ))}
                  </div>
                  <span className={s.strengthText} style={{ color: strengthColors[strength] }}>
                    {t('auth.signup.strengthLabel', { level: strengthLabels[strength] })}
                  </span>
                </div>
              )}

              <label className={s.termsCheckbox}>
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  required
                />
                <span>
                  <Trans
                    i18nKey="auth.signup.terms"
                    components={{
                      terms: <a href="#terms" style={{ color: '#1F6B3F' }} />,
                      privacy: <a href="#privacy" style={{ color: '#1F6B3F' }} />,
                    }}
                  />
                </span>
              </label>

              <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={loading}
                rightIcon={<Icon name="arrow_forward" size={18} />}
                className={s.submitBtn}
                style={{ backgroundColor: '#2E7D4F' }}
              >
                {t('auth.signupButton')}
              </Button>
            </form>

            <div className={s.footerText} style={{ marginTop: '16px' }}>
              {t('auth.alreadyAccount')}{' '}
              <Link to="/login/citizen" className={s.signupLink} style={{ color: '#2E7D4F' }}>
                {t('auth.loginLink')}
              </Link>
            </div>

            {/* Other Portals Switcher */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F7EFE1', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px' }}>
              <Link to="/signup/authority" style={{ color: '#7A1F2B', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="badge" size={14} />
                <span>Officer accounts</span>
              </Link>
              <span style={{ color: '#DCCDB5' }}>•</span>
              <Link to="/signup/superadmin" style={{ color: '#7A1F2B', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="admin_panel_settings" size={14} />
                <span>Admin accounts</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenSignup;
