import { getCurrentLocale, getLanguageMeta } from '../i18n';

export const formatAppNumber = (value, options) => (
  Number(value || 0).toLocaleString(getCurrentLocale(), options)
);

export const formatAppDate = (value, options) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(getCurrentLocale(), options);
};

export const formatAppDateTime = (value, options) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(getCurrentLocale(), options);
};

export const formatAppTime = (value, options) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(getCurrentLocale(), options);
};

export const formatDA = (value) => `${formatAppNumber(value)} DA`;

export const formatDAPerDay = (value) => {
  const suffixByLanguage = {
    ar: ' دج/اليوم',
    en: ' DZD/day',
    fr: ' DA/jour',
  };
  return `${formatAppNumber(value)}${suffixByLanguage[getLanguageMeta().code] || suffixByLanguage.fr}`;
};
