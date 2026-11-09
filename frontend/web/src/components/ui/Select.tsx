import React, { forwardRef } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, id, className = '', ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`${styles.container} ${className}`}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
            {props.required && <span className={styles.requiredMark}>*</span>}
          </label>
        )}
        <div className={`${styles.selectWrapper} ${error ? styles.hasError : ''}`}>
          <select id={selectId} ref={ref} className={styles.select} {...props}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className={styles.option}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className={styles.chevron}>▾</span>
        </div>
        {error && <p className={styles.errorMessage}>{error}</p>}
        {!error && helperText && <p className={styles.helperText}>{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
