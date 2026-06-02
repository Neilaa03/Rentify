import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import storage from '../utils/storage';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const LANGUAGE_STORAGE_KEY = 'rentifyLanguage';

export const supportedLanguages = [
  { code: 'fr', label: 'Francais', nativeLabel: 'Francais', locale: 'fr-FR', dir: 'ltr' },
  { code: 'en', label: 'English', nativeLabel: 'English', locale: 'en-US', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', locale: 'ar-DZ', dir: 'rtl' },
];

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
};

const normalizeLanguage = (language) => {
  const code = String(language || '').split('-')[0].toLowerCase();
  return supportedLanguages.some((item) => item.code === code) ? code : 'fr';
};

export const getLanguageMeta = (language = i18n.language) => (
  supportedLanguages.find((item) => item.code === normalizeLanguage(language)) || supportedLanguages[0]
);

export const getCurrentLocale = () => getLanguageMeta().locale;

export const setAppLanguage = async (language) => {
  const nextLanguage = normalizeLanguage(language);
  await i18n.changeLanguage(nextLanguage);
  try {
    await storage.setItemAsync(LANGUAGE_STORAGE_KEY, nextLanguage);
  } catch {
    // Persisting language is helpful, but the app can still run without storage.
  }
  return nextLanguage;
};

const getDeviceLanguage = () => {
  const locales = typeof Localization.getLocales === 'function' ? Localization.getLocales() : [];
  return normalizeLanguage(locales?.[0]?.languageTag || locales?.[0]?.languageCode);
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'fr',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

storage.getItemAsync(LANGUAGE_STORAGE_KEY)
  .then((savedLanguage) => {
    if (savedLanguage) return i18n.changeLanguage(normalizeLanguage(savedLanguage));
    return null;
  })
  .catch(() => null);

export default i18n;
