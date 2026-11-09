import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import s from './Login.module.css';

/**
 * Shown at /signup/authority and /signup/superadmin.
 * Officer and super-admin accounts cannot be created through public sign-up;
 * a super admin creates them from the admin portal (POST /api/v1/users/create/).
 */
export const StaffAccountNotice: React.FC = () => {
  const linkBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
  };

  return (
    <div className={s.container}>
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          margin: '0 auto',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '32px 28px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>
          <Icon name="badge" size={14} />
          <span>Staff accounts</span>
        </div>

        <h2 className={s.formTitle}>Officer and admin accounts are created by your administrator</h2>
        <p className={s.formSubtitle} style={{ marginBottom: '16px' }}>
          For security, CivicSetu has no public sign-up for municipal officers or administrators.
        </p>

        <ul style={{ margin: '0 0 24px 0', paddingLeft: '18px', color: '#334155', fontSize: '14px', lineHeight: 1.6 }}>
          <li><strong>Officers:</strong> ask your department head or the municipal IT cell. A super admin creates your account and shares your sign-in details.</li>
          <li><strong>Super admins:</strong> added by an existing super admin or by the IT team on the server.</li>
        </ul>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <Link to="/login/authority" style={{ ...linkBtn, background: '#2563eb', color: '#ffffff' }}>
            <Icon name="badge" size={16} />
            Officer sign in
          </Link>
          <Link to="/login/superadmin" style={{ ...linkBtn, background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
            <Icon name="admin_panel_settings" size={16} />
            Admin sign in
          </Link>
        </div>

        <div className={s.footerText}>
          Reporting a civic issue?{' '}
          <Link to="/signup/citizen" className={s.signupLink} style={{ color: '#16a34a' }}>
            Create a citizen account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StaffAccountNotice;
