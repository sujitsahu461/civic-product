import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, SupportedLanguage, setAppLanguage } from '../../i18n';
import Icon from './Icon';
import s from './LanguageSelector.module.css';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'compact' | 'full';
  theme?: 'dark' | 'light';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  variant = 'compact',
  theme = 'light',
}) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLangCode = (i18n.language?.slice(0, 2) as SupportedLanguage) || 'en';
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    setAppLanguage(code);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`${s.root} ${theme === 'dark' ? s.dark : s.light} ${className}`}
      data-testid="language-selector"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t('common.language')}: ${currentLang.nativeName}`}
        className={s.trigger}
      >
        <span className={s.label}>
          {variant === 'full' ? `${currentLang.nativeName} (${currentLang.label})` : currentLang.nativeName}
        </span>
        <span className={`${s.chevron} ${isOpen ? s.chevronOpen : ''}`}>
          <Icon name="expand_more" size={16} />
        </span>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('common.language')}
          className={s.menu}
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLangCode;
            return (
              <li
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => handleSelect(lang.code)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(lang.code);
                  }
                }}
                className={`${s.option} ${isSelected ? s.optionSelected : ''}`}
              >
                <div className={s.optionText}>
                  <span className={s.optionName}>{lang.nativeName}</span>
                  <span className={s.optionLabel}>{lang.label}</span>
                </div>
                {isSelected && (
                  <span className={s.check}>
                    <Icon name="check" size={16} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LanguageSelector;
