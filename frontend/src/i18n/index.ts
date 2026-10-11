import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import or from './locales/or.json';
import hi from './locales/hi.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'or', label: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const savedLanguage = (localStorage.getItem('civicsetu_lang') as SupportedLanguage) || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      or: { translation: or },
      hi: { translation: hi },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Synchronize document lang tag
if (typeof document !== 'undefined') {
  document.documentElement.lang = savedLanguage;
}

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('civicsetu_lang', lng);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

export const setAppLanguage = (lng: SupportedLanguage) => {
  i18n.changeLanguage(lng);
};

export default i18n;
