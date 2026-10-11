import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, SupportedLanguage, setAppLanguage } from '../../i18n';
import Icon from './Icon';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'compact' | 'full';
  theme?: 'dark' | 'light';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  variant = 'compact',
  theme = 'dark',
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

  const isLight = theme === 'light';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      data-testid="language-selector"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t('common.language')}: ${currentLang.nativeName}`}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
          isLight
            ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 hover:border-slate-400 shadow-sm'
            : 'text-gray-200 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 hover:border-gray-600'
        }`}
      >
        <span className={isLight ? 'text-emerald-600 flex items-center' : 'text-emerald-400 flex items-center'}>
          <Icon name="language" size={16} />
        </span>
        <span className="font-medium tracking-wide">
          {variant === 'full' ? `${currentLang.nativeName} (${currentLang.label})` : currentLang.nativeName}
        </span>
        <span className={`transition-transform duration-200 ${isLight ? 'text-slate-500' : 'text-gray-400'} ${isOpen ? 'rotate-180' : ''}`}>
          <Icon name="expand_more" size={14} />
        </span>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('common.language')}
          className={`absolute right-0 mt-1.5 w-44 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md ${
            isLight
              ? 'bg-white border border-slate-200 text-slate-800'
              : 'bg-[#141b2d] border border-gray-700/80 text-gray-200'
          }`}
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
                className={`flex items-center justify-between px-3.5 py-2 text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? isLight
                      ? 'bg-emerald-50 text-emerald-700 font-bold border-l-2 border-emerald-600'
                      : 'bg-emerald-600/20 text-emerald-300 font-bold border-l-2 border-emerald-500'
                    : isLight
                    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{lang.nativeName}</span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{lang.label}</span>
                </div>
                {isSelected && (
                  <span className={isLight ? 'text-emerald-600' : 'text-emerald-400'}>
                    <Icon name="check" size={14} />
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
