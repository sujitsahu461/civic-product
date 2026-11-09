import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastDispatcher: ((message: string, type?: ToastType) => void) | null = null;

export const showToast = (message: string, type: ToastType = 'info') => {
  if (toastDispatcher) {
    toastDispatcher(message, type);
  }
};

export const useToast = () => {
  return {
    showToast: (message: string, type: ToastType = 'info') => showToast(message, type),
    toast: (message: string, type: ToastType = 'info') => showToast(message, type),
    success: (message: string) => showToast(message, 'success'),
    error: (message: string) => showToast(message, 'error'),
    warning: (message: string) => showToast(message, 'warning'),
    info: (message: string) => showToast(message, 'info'),
  };
};

export const ToastContainer: React.FC = () => {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastDispatcher = (message: string, type: ToastType = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    };

    return () => {
      toastDispatcher = null;
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          <span className={styles.icon}>{getIcon(toast.type)}</span>
          <div className={styles.message}>{toast.message}</div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => removeToast(toast.id)}
            aria-label={t('common.closeNotification')}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
