import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  variant?: 'citizen' | 'authority' | 'superadmin' | 'success' | 'warning' | 'danger' | 'neutral';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  className = '',
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
