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
  { value: 'Road and Infrastructure', label: 'Road and Infrastructure' },
  { value: 'Electricity', label: 'Electricity' },
  { value: 'Water Supply', label: 'Water Supply' },
  { value: 'Sanitation and Waste', label: 'Sanitation and Waste' },
  { value: 'Drainage and Sewerage', label: 'Drainage and Sewerage' },
  { value: 'Parks and Environment', label: 'Parks and Environment' },
  { value: 'Traffic and Public Safety', label: 'Traffic and Public Safety' },
  { value: 'Municipal Administration', label: 'Municipal Administration' },
];

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [role, setRole] = useState<'CITIZEN' | 'AUTHORITY'>('CITIZEN');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
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
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#059669'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!termsAgreed) {
      setFormError('Please accept the Terms of Service and Privacy Policy to proceed.');
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

    if (role === 'AUTHORITY' && !department) {
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
        role,
        department: role === 'AUTHORITY' ? department : undefined,
        designation: role === 'AUTHORITY' ? (designation.trim() || undefined) : undefined,
        address: address.trim() || undefined,
      });

      success(`Account created successfully! Welcome to CivicSetu, ${fullName}.`);

      if (role === 'AUTHORITY') {
        navigate('/authority/dashboard');
      } else {
        navigate('/citizen/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please check your inputs and try again.';
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
                <span className={s.brandBadge}>CITIZEN ENROLLMENT</span>
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
              <span>Every report makes a difference.</span>
            </div>

            <h1 className={s.editorialHeading}>
              Connecting Citizens.<br />
              Improving Communities.
            </h1>

            <p className={s.editorialSubheading}>
              Whether reporting neighborhood infrastructure concerns or managing municipal dispatches, join a community dedicated to cleaner, safer public spaces.
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
            <span>Official Digital Public Infrastructure © 2026 CivicSetu</span>
          </div>
        </div>

        {/* Right Panel: Clean Registration Form */}
        <div className={s.rightPanel}>
          <div className={`${s.formWrapper} ${s.signupFormWrapper}`}>
            <div className={s.formHeader}>
              <div className={s.badgeRow}>
                <span className={s.portalBadge}>
                  {role === 'AUTHORITY' ? 'AUTHORITY REGISTRATION' : 'CITIZEN REGISTRATION'}
                </span>
              </div>
              <h2 className={s.title}>Create your CivicSetu account</h2>
              <p className={s.subtitle}>
                Join your community and help make local issues easier to report and track.
              </p>
            </div>

            {/* Account Type Toggle */}
            <div className={s.accountTypeToggle}>
              <button
                type="button"
                className={`${s.typeBtn} ${role === 'CITIZEN' ? s.typeBtnActive : ''}`}
                onClick={() => setRole('CITIZEN')}
              >
                <Icon name="person" size={16} />
                <span>Citizen</span>
              </button>
              <button
                type="button"
                className={`${s.typeBtn} ${role === 'AUTHORITY' ? s.typeBtnActive : ''}`}
                onClick={() => setRole('AUTHORITY')}
              >
                <Icon name="shield" size={16} />
                <span>Municipal Authority</span>
              </button>
            </div>

            {formError && (
              <div className={s.errorBanner}>
                <Icon name="error" size={18} />
                <span>{formError}</span>
              </div>
            )}

            {/* Signup Form */}
            <form className={s.form} onSubmit={handleSubmit}>
              <div className={s.fieldGroup}>
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  leftIcon={<Icon name="person" size={18} />}
                />
              </div>

              <div className={s.formRow}>
                <Input
                  label={role === 'AUTHORITY' ? 'Official Email' : 'Email Address'}
                  type="email"
                  placeholder={role === 'AUTHORITY' ? 'officer@civicsetu.gov.in' : 'name@example.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={<Icon name="mail" size={18} />}
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<Icon name="call" size={18} />}
                />
              </div>

              {role === 'AUTHORITY' ? (
                <div className={s.formRow}>
                  <Select
                    label="Department"
                    placeholder="Select Department"
                    options={MUNICIPAL_DEPARTMENTS}
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  />

                  <Input
                    label="Designation / Ward"
                    type="text"
                    placeholder="e.g. Executive Engineer"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    leftIcon={<Icon name="domain" size={18} />}
                  />
                </div>
              ) : (
                <div className={s.fieldGroup}>
                  <Input
                    label="Ward / Area Address (Optional)"
                    type="text"
                    placeholder="e.g. Ward 14, Green Park, South Zone"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    leftIcon={<Icon name="home_pin" size={18} />}
                  />
                </div>
              )}

              <div className={s.formRow}>
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  leftIcon={<Icon name="lock" size={18} />}
                />

                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  leftIcon={<Icon name="lock_reset" size={18} />}
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

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className={s.strengthMeter}>
                  <div className={s.strengthBar}>
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={s.strengthSegment}
                        style={{
                          background:
                            strength >= step ? strengthColors[strength] : '#E2E8F0',
                        }}
                      ></div>
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
                  className={s.checkbox}
                  required
                />
                <span>
                  I agree to the{' '}
                  <a href="#terms" className={s.signupLink}>
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#privacy" className={s.signupLink}>
                    Privacy Policy
                  </a>.
                </span>
              </label>

              <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={loading}
                rightIcon={<Icon name="arrow_forward" size={18} />}
                className={s.submitBtn}
              >
                Create Account
              </Button>
            </form>

            <div className={s.footerText}>
              Already have an account?{' '}
              <Link to="/login/citizen" className={s.signupLink}>
                Sign in
              </Link>
            </div>

            {/* Separate Dedicated Portals */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Dedicated Registration Portals:
              </span>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
                <Link to="/signup/citizen" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
                  🌱 Citizen
                </Link>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <Link to="/signup/authority" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                  🏛️ Authority
                </Link>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <Link to="/signup/superadmin" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
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

export default Signup;
