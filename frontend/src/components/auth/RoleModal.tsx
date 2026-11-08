import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '../ui/Icon';
import LanguageSelector from '../ui/LanguageSelector';
import s from './RoleModal.module.css';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<'login' | 'signup'>(defaultMode);

  React.useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  if (!isOpen) return null;

  const handleSelect = (rolePath: string) => {
    onClose();
    navigate(`/${mode}/${rolePath}`);
  };

  return (
    <div className={s.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.topActions}>
          <LanguageSelector theme="light" />
          <button
            type="button"
            className={s.closeButton}
            onClick={onClose}
            aria-label={t('roleModal.closeDialog')}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className={s.header}>
          <div className={s.badge}>
            <Icon name="account_balance" size={16} />
            <span>{t('roleModal.gatewayBadge', 'CIVICSETU GATEWAY')}</span>
          </div>
          <h2 className={s.title}>
            {mode === 'login'
              ? t('roleModal.signInTitle', 'Select Your Portal to Sign In')
              : t('roleModal.registerTitle', 'Select Account Type to Register')}
          </h2>
          <p className={s.subtitle}>
            {t(
              'roleModal.subtitle',
              'Choose your designated civic workspace for role-specific access and permissions.'
            )}
          </p>

          <div className={s.modeSwitcher}>
            <button
              type="button"
              className={`${s.modeBtn} ${mode === 'login' ? s.modeBtnActive : ''}`}
              onClick={() => setMode('login')}
            >
              <Icon name="login" size={16} />
              <span>{t('roleModal.signInTab', 'Sign In')}</span>
            </button>
            <button
              type="button"
              className={`${s.modeBtn} ${mode === 'signup' ? s.modeBtnActive : ''}`}
              onClick={() => setMode('signup')}
            >
              <Icon name="person_add" size={16} />
              <span>{t('roleModal.createAccountTab', 'Create Account')}</span>
            </button>
          </div>
        </div>

        <div className={s.roleGrid}>
          {/* 1. CITIZEN CARD */}
          <div
            className={`${s.roleCard} ${s.citizenCard}`}
            onClick={() => handleSelect('citizen')}
          >
            <div className={s.cardIconWrap}>
              <span className={s.cardEmoji}>🌱</span>
              <Icon name="person" size={26} className={s.cardIcon} />
            </div>
            <div className={s.cardContent}>
              <div className={s.cardHeaderRow}>
                <h3 className={s.roleTitle}>{t('roleModal.citizen.title', 'Citizen Portal')}</h3>
                <span className={s.rolePill}>{t('roleModal.citizen.badge', 'Public Access')}</span>
              </div>
              <p className={s.roleDesc}>
                {t(
                  'roleModal.citizen.desc',
                  'Lodge civic grievances, track live status via ticket codes, view GIS incident radar, and submit redressal feedback.'
                )}
              </p>
              <ul className={s.featuresList}>
                <li>
                  <Icon name="check" size={14} />
                  <span>{t('roleModal.citizen.feat1', 'Direct jurisdiction dispatch')}</span>
                </li>
                <li>
                  <Icon name="check" size={14} />
                  <span>{t('roleModal.citizen.feat2', 'Voice, photo & video evidence')}</span>
                </li>
                <li>
                  <Icon name="check" size={14} />
                  <span>{t('roleModal.citizen.feat3', 'Real-time SLA notifications')}</span>
                </li>
              </ul>
            </div>
            <div className={s.cardFooter}>
              <span className={s.actionText}>
                {mode === 'login'
                  ? t('roleModal.citizen.actionLogin', 'Sign In as Citizen')
                  : t('roleModal.citizen.actionSignup', 'Register as Citizen')}
              </span>
              <Icon name="arrow_forward" size={18} />
            </div>
          </div>

          {/* 2. MUNICIPAL AUTHORITY CARD */}
          <div
            className={`${s.roleCard} ${s.authorityCard}`}
            onClick={() => handleSelect('authority')}
          >
            <div className={s.cardIconWrap}>
              <span className={s.cardEmoji}>🏛️</span>
              <Icon name="badge" size={26} className={s.cardIcon} />
            </div>
            <div className={s.cardContent}>
              <div className={s.cardHeaderRow}>
                <h3 className={s.roleTitle}>{t('roleModal.authority.title', 'Municipal Authority')}</h3>
                <span className={s.rolePillAuthority}>
                  {t('roleModal.authority.badge', 'Nodal Desk')}
                </span>
              </div>
              <p className={s.roleDesc}>
                {t(
                  'roleModal.authority.desc',
                  'Department-scoped dashboard for engineers, nodal officers, and resolution personnel to triage and resolve issues.'
                )}
              </p>
              <ul className={s.featuresList}>
                <li>
                  <Icon name="check" size={14} />
                  <span>{t('roleModal.authority.feat1', 'Department-scoped queues')}</span>
                </li>
                <li>
                  <Icon name="check" size={14} />
                  <span>{t('roleModal.authority.feat2', 'State machine progression')}</span>
                </li>
                <li>
                  <Icon name="check" size={14} />
                  <span>{t('roleModal.authority.feat3', 'Resolution proof image verification')}</span>
                </li>
              </ul>
            </div>
            <div className={s.cardFooter}>
              <span className={s.actionText}>
                {mode === 'login'
                  ? t('roleModal.authority.actionLogin', 'Officer Sign In')
                  : t('roleModal.authority.actionSignup', 'Authority Registration')}
              </span>
              <Icon name="arrow_forward" size={18} />
            </div>
          </div>

          {/* 3. SUPER ADMIN CARD */}
          <div
            className={`${s.roleCard} ${s.adminCard}`}
            onClick={() => handleSelect('superadmin')}
          >
            <div className={s.cardIconWrap}>
              <span className={s.cardEmoji}>🛡️</span>
              <Icon name="admin_panel_settings" size={26} className={s.cardIcon} />
            </div>
            <div className={s.cardContent}>
              <div className={s.cardHeaderRow}>
                <h3 className={s.roleTitle}>{t('roleModal.admin.title', 'Super Admin')}</h3>
                <span className={s.rolePillAdmin}>{t('roleModal.admin.badge', 'Command HQ')}</span>
              </div>
              <p className={s.roleDesc}>
                {t(
                  'roleModal.admin.desc',
                  'Executive municipal oversight: manage departments, authority credentials, citywide analytics, and immutable security audit logs.'
                )}
              </p>
              <ul className={s.featuresList}>
                <li>
                  <Icon name="check" size={14} />
                  <span>{t('roleModal.admin.feat1', 'Complete system telemetry')}</span>
                </li>
                <li>
                  <Icon name="check" size={14} />
                  <span>{t('roleModal.admin.feat2', 'Officer & department provisioning')}</span>
                </li>
                <li>
                  <Icon name="check" size={14} />
                  <span>{t('roleModal.admin.feat3', 'Comprehensive security audit trail')}</span>
                </li>
              </ul>
            </div>
            <div className={s.cardFooter}>
              <span className={s.actionText}>
                {mode === 'login'
                  ? t('roleModal.admin.actionLogin', 'Admin Access Terminal')
                  : t('roleModal.admin.actionSignup', 'Admin Security Setup')}
              </span>
              <Icon name="arrow_forward" size={18} />
            </div>
          </div>
        </div>

        <div className={s.modalBottom}>
          <div className={s.securityNotice}>
            <Icon name="lock" size={14} />
            <span>
              {t(
                'roleModal.securityNotice',
                'Secured with cryptographic arithmetic challenge & JWT session encryption'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleModal;

