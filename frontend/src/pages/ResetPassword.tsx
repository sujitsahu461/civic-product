import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import s from './Login.module.css';

export const ResetPassword: React.FC = () => {
  const { t } = useTranslation();
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
      setFormError(t('auth.reset.errEmailFirst'));
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
      success(t('auth.reset.linkSentToast'));
    } catch (err: any) {
      let msg = t('auth.reset.errSendFailed');
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
      setFormError(t('auth.reset.errEmail'));
      return;
    }
    setStep('password');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() && (!uid || !token)) {
      setFormError(t('auth.reset.errAccountEmail'));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t('auth.reset.errMismatch'));
      return;
    }

    if (password.length < 8) {
      setFormError(t('auth.common.passwordMinLength'));
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
      success(t('auth.reset.resetSuccessToast'));
    } catch (err: any) {
      let msg = t('auth.reset.errResetFailed');
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
      toastError(typeof msg === 'string' ? msg : t('auth.reset.errResetShort'));
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
                <span className={s.brandBadge}>{t('auth.reset.badge')}</span>
              </div>
            </Link>

            <div className={s.sealWrapper}>
              <span style={{ fontSize: '28px' }}>🔒</span>
            </div>
          </div>

          <div className={s.visualBody}>
            <div className={s.visualTagline}>
              <span className={s.taglineDot} />
              <span>{t('auth.reset.tagline')}</span>
            </div>

            <h1 className={s.editorialHeading}>
              {t('auth.reset.headingLine1')}<br />
              {t('auth.reset.headingLine2')}
            </h1>

            <p className={s.editorialSubheading}>
              {t('auth.reset.subheading')}
            </p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1F6B3F' }}>
                {t('auth.reset.chipInstant')}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1F6B3F' }}>
                {t('auth.reset.chipEncryption')}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1F6B3F' }}>
                {t('auth.reset.chipZeroWait')}
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
            <div className={s.formHeader}>
              <div className={s.badgeRow}>
                <span className={s.portalBadge}>{t('auth.reset.formBadge')}</span>
              </div>
              <h2 className={s.title}>{t('auth.reset.title')}</h2>
              <p className={s.subtitle}>
                {t('auth.reset.subtitle')}
              </p>
            </div>

            {isDone ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%', background: '#E6F4EA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                  fontSize: '28px', color: '#2E7D4F'
                }}>
                  ✓
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#3B2418', marginBottom: '8px' }}>
                  {t('auth.reset.doneTitle')}
                </h4>
                <p style={{ fontSize: '14px', color: '#7D6657', marginBottom: '24px', lineHeight: 1.6 }}>
                  {t('auth.reset.doneText')}
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/login/citizen')}
                  rightIcon={<Icon name="arrow_forward" size={18} />}
                  className={s.submitBtn}
                  style={{ marginTop: '8px' }}
                >
                  {t('auth.reset.proceedSignIn')}
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
                      label={t('auth.reset.emailLabel')}
                      type="email"
                      placeholder={t('auth.reset.emailPlaceholder')}
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
                    {t('auth.reset.continueBtn')}
                  </Button>

                  <div style={{ textAlign: 'center', margin: '14px 0 6px 0', fontSize: '12px', color: '#857060' }}>
                    {t('auth.reset.or')}
                  </div>

                  <button
                    type="button"
                    onClick={handleSendEmailLink}
                    disabled={sendingLink}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '10px',
                      border: '1px solid #DCCDB5',
                      background: '#FFFFFF',
                      color: '#5A4033',
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
                    <span>{sendingLink ? t('auth.reset.sendingLink') : t('auth.reset.sendLink')}</span>
                  </button>
                </form>

                {emailLinkSent && (
                  <div style={{
                    marginTop: '16px',
                    padding: '14px',
                    background: '#E6F4EA',
                    border: '1px solid #B7DEC3',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: '#1F6B3F'
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{t('auth.reset.linkSentTitle')}</div>
                    <p style={{ margin: '0 0 8px 0', color: '#1F6B3F', lineHeight: 1.5 }}>
                      <Trans
                        i18nKey="auth.reset.linkSentText"
                        values={{ email }}
                        components={{ bold: <strong /> }}
                      />
                    </p>
                    {generatedResetUrl && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#1F6B3F' }}>{t('auth.reset.devLink')}</span>
                        <a
                          href={generatedResetUrl}
                          style={{
                            display: 'block',
                            marginTop: '4px',
                            wordBreak: 'break-all',
                            color: '#7A1F2B',
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
                  {t('auth.reset.rememberCreds')}{' '}
                  <Link to="/login/citizen" className={s.signupLink}>
                    {t('auth.reset.backToSignIn')}
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
                    background: '#FFFBF2', border: '1px solid #EADFCB', borderRadius: '12px',
                    padding: '10px 14px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon name="mail" size={18} style={{ color: '#2E7D4F' }} />
                      <span style={{ fontSize: '13px', color: '#5A4033', fontWeight: 600 }}>{email}</span>
                    </div>
                    {!hasResetToken && (
                      <button
                        type="button"
                        onClick={() => { setStep('email'); setFormError(''); }}
                        style={{
                          background: '#E6F4EA', color: '#1F6B3F', border: '1px solid #B7DEC3',
                          padding: '4px 10px', borderRadius: '8px', fontSize: '12px',
                          fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        {t('auth.reset.changeEmail')}
                      </button>
                    )}
                  </div>
                )}

                <form className={s.form} onSubmit={handleSubmit}>
                  <div className={s.fieldGroup}>
                    <Input
                      label={t('auth.reset.newPasswordLabel')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.reset.newPasswordPlaceholder')}
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

                  <div className={s.fieldGroup}>
                    <Input
                      label={t('auth.reset.confirmNewLabel')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('auth.reset.confirmNewPlaceholder')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      leftIcon={<Icon name="lock" size={18} />}
                      rightIcon={
                        <button
                          type="button"
                          className={s.iconToggleBtn}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? t('auth.common.hidePassword') : t('auth.common.showPassword')}
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
                    {t('auth.reset.updateBtn')}
                  </Button>
                </form>

                <div className={s.footerText} style={{ marginTop: 24 }}>
                  {t('auth.reset.rememberCreds')}{' '}
                  <Link to="/login/citizen" className={s.signupLink}>
                    {t('auth.reset.backToSignIn')}
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
