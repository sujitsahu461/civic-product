import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Icon from '../components/ui/Icon';
import s from './Login.module.css';

const MUNICIPAL_DEPARTMENTS = [
  { value: 'Road and Infrastructure', label: 'Road and Infrastructure (PWD)' },
  { value: 'Electricity', label: 'Electricity & Street Lighting' },
  { value: 'Water Supply', label: 'Water Supply & Pipelines' },
  { value: 'Sanitation and Waste', label: 'Sanitation & Solid Waste Management' },
  { value: 'Drainage and Sewerage', label: 'Drainage & Stormwater Sewerage' },
  { value: 'Parks and Environment', label: 'Parks, Horticulture & Environment' },
  { value: 'Traffic and Public Safety', label: 'Traffic & Public Safety' },
  { value: 'Municipal Administration', label: 'Municipal Administration & Revenue' },
];

export const AuthoritySignup: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Road and Infrastructure');
  const [designation, setDesignation] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#059669'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!termsAgreed) {
      setFormError('Please accept the Official Protocol & Terms of Service.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify both fields.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (!department) {
      setFormError('Please select your municipal department.');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        role: 'AUTHORITY',
        department,
        designation: designation.trim() || 'Nodal Officer',
        address: address.trim() || undefined,
      });

      success(`Municipal Officer registered! Welcome, ${fullName}.`);
      navigate('/authority/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please check the entered information.';
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
        <div className={s.leftPanel} style={{ background: 'linear-gradient(165deg, #eff6ff 0%, #dbeafe 55%, #bfdbfe 100%)' }}>
          <div className={s.leftGlow} style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%)' }} />

          <div className={s.visualTopRow}>
            <Link to="/" className={s.brandHeader} style={{ textDecoration: 'none' }}>
              <div className={s.brandLogo}>
                <img src="/logo-mark.png" alt="CivicSetu" className={s.brandLogoImg} />
              </div>
              <div className={s.brandMeta}>
                <span className={s.brandName}>CivicSetu</span>
                <span className={s.brandBadge} style={{ background: '#dbeafe', color: '#1e40af' }}>AUTHORITY DESK</span>
              </div>
            </Link>

            <div className={s.sealWrapper}>
              <span style={{ fontSize: '28px' }}>🏛️</span>
            </div>
          </div>

          <div className={s.visualBody}>
            <div className={s.visualTagline}>
              <span className={s.taglineDot} style={{ background: '#2563eb' }} />
              <span>Municipal Officer Onboarding</span>
            </div>

            <h1 className={s.editorialHeading} style={{ color: '#0f172a' }}>
              Urban Local Bodies.<br />
              Nodal Efficiency.<br />
              Automated Triage.
            </h1>

            <p className={s.editorialSubheading} style={{ color: '#334155' }}>
              Create your official municipal account to join department-scoped queues, coordinate field teams, and verify grievance resolutions.
            </p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.75)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1d4ed8' }}>
                ✓ Zonal dispatch routing
              </span>
              <span style={{ background: 'rgba(255,255,255,0.75)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1d4ed8' }}>
                ✓ Official audit tracking
              </span>
              <span style={{ background: 'rgba(255,255,255,0.75)', padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, color: '#1d4ed8' }}>
                ✓ SLA compliance metrics
              </span>
            </div>
          </div>

          <div className={s.visualFooter}>
            <Link to="/" style={{ color: '#1d4ed8', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              ← Return to Main Homepage
            </Link>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className={s.rightPanel}>
          <div className={s.formWrapper}>
            <div className={s.headerContent}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                <Icon name="badge" size={14} />
                <span>Authority Registration</span>
              </div>
              <h2 className={s.formTitle}>Register Municipal Authority</h2>
              <p className={s.formSubtitle}>
                Create an official officer account mapped to your municipal department.
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
                  label="Officer Full Name & Title"
                  type="text"
                  placeholder="e.g. Er. Rajesh Verma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  leftIcon={<Icon name="person" size={18} />}
                />
              </div>

              <div className={s.formRow}>
                <div className={s.fieldGroup}>
                  <Input
                    label="Official Govt / Department Email"
                    type="email"
                    placeholder="officer@civicsetu.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    leftIcon={<Icon name="mail" size={18} />}
                  />
                </div>

                <div className={s.fieldGroup}>
                  <Input
                    label="Contact Phone"
                    type="tel"
                    placeholder="e.g. 9876543211"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={<Icon name="call" size={18} />}
                  />
                </div>
              </div>

              <div className={s.formRow}>
                <div className={s.fieldGroup}>
                  <Select
                    label="Assigned Municipal Department"
                    options={MUNICIPAL_DEPARTMENTS}
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  />
                </div>

                <div className={s.fieldGroup}>
                  <Input
                    label="Designation / Role Title"
                    type="text"
                    placeholder="e.g. Executive Engineer"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    leftIcon={<Icon name="work" size={18} />}
                  />
                </div>
              </div>

              <div className={s.fieldGroup}>
                <Input
                  label="Office / Zonal Division Address"
                  type="text"
                  placeholder="e.g. PWD Zonal Office, Ward 04"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  leftIcon={<Icon name="location_on" size={18} />}
                />
              </div>

              <div className={s.formRow}>
                <div className={s.fieldGroup}>
                  <Input
                    label="Set Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    leftIcon={<Icon name="lock" size={18} />}
                  />
                </div>

                <div className={s.fieldGroup}>
                  <Input
                    label="Confirm Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    leftIcon={<Icon name="lock_reset" size={18} />}
                  />
                </div>
              </div>

              {password && (
                <div className={s.strengthMeter}>
                  <div className={s.strengthBar}>
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={s.strengthSegment}
                        style={{
                          backgroundColor: strength >= level ? strengthColors[strength] : '#e2e8f0',
                        }}
                      />
                    ))}
                  </div>
                  <span className={s.strengthText} style={{ color: strengthColors[strength] }}>
                    Password Strength: {strengthLabels[strength]}
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
                  I confirm that I am an authorized municipal officer adhering to official ULB privacy protocols and SLA redressal mandates.
                </span>
              </label>

              <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={loading}
                rightIcon={<Icon name="arrow_forward" size={18} />}
                className={s.submitBtn}
                style={{ backgroundColor: '#2563eb' }}
              >
                Register as Municipal Authority
              </Button>
            </form>

            <div className={s.footerText} style={{ marginTop: '16px' }}>
              Already registered as an authority?{' '}
              <Link to="/login/authority" className={s.signupLink} style={{ color: '#2563eb' }}>
                Officer Sign In
              </Link>
            </div>

            {/* Other Portals Switcher */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px' }}>
              <Link to="/signup/citizen" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="person" size={14} />
                <span>Citizen Registration</span>
              </Link>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Link to="/signup/superadmin" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="admin_panel_settings" size={14} />
                <span>Super Admin Setup</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthoritySignup;
