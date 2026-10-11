import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
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
        <button
          type="button"
          className={s.closeButton}
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" size={20} />
        </button>

        <div className={s.header}>
          <div className={s.badge}>
            <Icon name="account_balance" size={16} />
            <span>CIVICSETU GATEWAY</span>
          </div>
          <h2 className={s.title}>
            {mode === 'login' ? 'Select Your Portal to Sign In' : 'Select Account Type to Register'}
          </h2>
          <p className={s.subtitle}>
            Choose your designated civic workspace for role-specific access and permissions.
          </p>

          <div className={s.modeSwitcher}>
            <button
              type="button"
              className={`${s.modeBtn} ${mode === 'login' ? s.modeBtnActive : ''}`}
              onClick={() => setMode('login')}
            >
              <Icon name="login" size={16} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className={`${s.modeBtn} ${mode === 'signup' ? s.modeBtnActive : ''}`}
              onClick={() => setMode('signup')}
            >
              <Icon name="person_add" size={16} />
              <span>Create Account</span>
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
                <h3 className={s.roleTitle}>Citizen Portal</h3>
                <span className={s.rolePill}>Public Access</span>
              </div>
              <p className={s.roleDesc}>
                Lodge civic grievances, track live status via ticket codes, view GIS incident radar, and submit redressal feedback.
              </p>
              <ul className={s.featuresList}>
                <li><Icon name="check" size={14} /> Auto AI category triage</li>
                <li><Icon name="check" size={14} /> Image evidence upload</li>
                <li><Icon name="check" size={14} /> Real-time SLA notifications</li>
              </ul>
            </div>
            <div className={s.cardFooter}>
              <span className={s.actionText}>
                {mode === 'login' ? 'Sign In as Citizen' : 'Register as Citizen'}
              </span>
              <Icon name="arrow_forward" size={18} />
            </div>
          </div>

          {/* 2. AUTHORITY CARD */}
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
                <h3 className={s.roleTitle}>Municipal Authority</h3>
                <span className={s.rolePillAuthority}>Nodal Desk</span>
              </div>
              <p className={s.roleDesc}>
                Department-scoped dashboard for engineers, nodal officers, and resolution personnel to triage and resolve issues.
              </p>
              <ul className={s.featuresList}>
                <li><Icon name="check" size={14} /> Department-scoped queues</li>
                <li><Icon name="check" size={14} /> State machine progression</li>
                <li><Icon name="check" size={14} /> Resolution proof image verification</li>
              </ul>
            </div>
            <div className={s.cardFooter}>
              <span className={s.actionText}>
                {mode === 'login' ? 'Officer Sign In' : 'Authority Registration'}
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
                <h3 className={s.roleTitle}>Super Admin</h3>
                <span className={s.rolePillAdmin}>Command HQ</span>
              </div>
              <p className={s.roleDesc}>
                Executive municipal oversight: manage departments, authority credentials, citywide analytics, and immutable security audit logs.
              </p>
              <ul className={s.featuresList}>
                <li><Icon name="check" size={14} /> Complete system telemetry</li>
                <li><Icon name="check" size={14} /> Officer & department provisioning</li>
                <li><Icon name="check" size={14} /> Comprehensive security audit trail</li>
              </ul>
            </div>
            <div className={s.cardFooter}>
              <span className={s.actionText}>
                {mode === 'login' ? 'Admin Access Terminal' : 'Admin Security Setup'}
              </span>
              <Icon name="arrow_forward" size={18} />
            </div>
          </div>
        </div>

        <div className={s.modalBottom}>
          <div className={s.securityNotice}>
            <Icon name="lock" size={14} />
            <span>Secured with cryptographic arithmetic challenge & JWT session encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleModal;
