import type { TFunction } from 'i18next';

// Place names in config/mapConfig.ts double as lookup ids, so they stay in
// English there; this maps them to translated display labels.
const PLACE_KEYS: Record<string, string> = {
  '🇮🇳 Whole India': 'wholeIndia',
  'Sambalpur (Modipara)': 'sbpModipara',
  'Sambalpur (Sakhipara)': 'sbpSakhipara',
  'Sambalpur (Budharaja)': 'sbpBudharaja',
  'Sambalpur (Dhanupali)': 'sbpDhanupali',
  'Sambalpur (Khetrajpur)': 'sbpKhetrajpur',
  'Sambalpur (Burla)': 'sbpBurla',
  'Sambalpur (Ainthapali)': 'sbpAinthapali',
  'Sambalpur (City Center)': 'sbpCityCenter',
  'Gunupur / GIET': 'gunupurGiet',
  Rayagada: 'rayagada',
  Bhubaneswar: 'bhubaneswar',
  Cuttack: 'cuttack',
  Rourkela: 'rourkela',
  'New Delhi': 'newDelhi',
  Mumbai: 'mumbai',
  Bengaluru: 'bengaluru',
  Kolkata: 'kolkata',
  Hyderabad: 'hyderabad',
  Modipara: 'modipara',
  Sakhipara: 'sakhipara',
  Budharaja: 'budharaja',
  Dhanupali: 'dhanupali',
  'GIET Gunupur': 'gietGunupur',
  'Central Ward': 'centralWard',
};

/** Translated label for a known place name; anything else (e.g. a user's own address) is returned unchanged. */
export const placeLabel = (name: string | null | undefined, t: TFunction): string => {
  if (!name) return '';
  const key = PLACE_KEYS[name];
  return key ? t(`map.places.${key}`) : name;
};
