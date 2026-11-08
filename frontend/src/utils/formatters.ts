import i18n from '../i18n';

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Pages that follow the language dropdown pass i18n.language; without it the
// output stays English. Browsers lack Odia date data, so non-English output
// is built from the translation files instead of Intl.
const isEnglish = (lang?: string) => !lang || lang.startsWith('en');

export function formatDate(dateString?: string | null, lang?: string): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (!isEnglish(lang)) {
      if (isNaN(d.getTime())) return dateString;
      const opts = { lng: lang };
      const hours24 = d.getHours();
      const hours = String(hours24 % 12 || 12).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const month = i18n.t(`dates.months.${MONTH_KEYS[d.getMonth()]}`, opts);
      const period = i18n.t(hours24 < 12 ? 'dates.am' : 'dates.pm', opts);
      return `${d.getDate()} ${month} ${d.getFullYear()}, ${hours}:${minutes} ${period}`;
    }
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatTimeAgo(dateString?: string | null, lang?: string): string {
  if (!dateString) return '';
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (!isEnglish(lang)) {
    const opts = { lng: lang };
    if (seconds < 60) return i18n.t('dates.justNow', opts);
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return i18n.t('dates.minutesAgo', { ...opts, n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return i18n.t('dates.hoursAgo', { ...opts, n: hrs });
    return i18n.t('dates.daysAgo', { ...opts, n: Math.floor(hrs / 24) });
  }
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncateText(text: string, maxLength: number = 80): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
