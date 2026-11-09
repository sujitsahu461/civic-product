import React, { forwardRef } from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, id, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`${styles.container} ${className}`}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {props.required && <span className={styles.requiredMark}>*</span>}
          </label>
        )}
        <div className={`${styles.inputWrapper} ${error ? styles.hasError : ''}`}>
          {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
          <input
            id={inputId}
            ref={ref}
            className={`${styles.input} ${leftIcon ? styles.withLeftIcon : ''} ${
              rightIcon ? styles.withRightIcon : ''
            }`}
            {...props}
          />
          {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
        </div>
        {error && <p className={styles.errorMessage}>{error}</p>}
        {!error && helperText && <p className={styles.helperText}>{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
