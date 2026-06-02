import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import storage from '../utils/storage';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const LANGUAGE_STORAGE_KEY = 'rentifyLanguage';
const languageListeners = new Set();

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

export const subscribeToLanguageChanges = (listener) => {
  languageListeners.add(listener);
  return () => languageListeners.delete(listener);
};

const notifyLanguageListeners = (language) => {
  languageListeners.forEach((listener) => {
    try {
      listener(language);
    } catch {
      // Ignore listener failures so one stale screen cannot block language updates.
    }
  });
};

const applyLanguageDirection = (language) => {
  const meta = getLanguageMeta(language);
  const isRTL = meta.dir === 'rtl';
  try {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(isRTL);
  } catch {
    // Direction support differs between native/web runtimes.
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
  }
};

export const setAppLanguage = async (language) => {
  const nextLanguage = normalizeLanguage(language);
  await i18n.changeLanguage(nextLanguage);
  applyLanguageDirection(nextLanguage);
  notifyLanguageListeners(nextLanguage);
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
    if (savedLanguage) {
      const normalized = normalizeLanguage(savedLanguage);
      applyLanguageDirection(normalized);
      return i18n.changeLanguage(normalized).then(() => notifyLanguageListeners(normalized));
    }
    applyLanguageDirection(i18n.language);
    return null;
  })
  .catch(() => null);

export default i18n;
