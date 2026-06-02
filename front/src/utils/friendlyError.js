const ERROR_RULES = [
  { match: /auth|token|session|connecter|login|not authenticated|missing auth/i, key: 'common.errors.authRequired' },
  { match: /network|fetch|timeout|backend|server|joignable|reach/i, key: 'common.errors.network' },
  { match: /permission|access denied|forbidden|unauthorized/i, key: 'common.errors.forbidden' },
  { match: /not found|introuvable|indisponible/i, key: 'common.errors.notFound' },
  { match: /date|available|disponible|réservée|reservee/i, key: 'common.errors.dateUnavailable' },
  { match: /payment|stripe|paiement|card/i, key: 'common.errors.payment' },
  { match: /upload|televers|télévers|document|file|image/i, key: 'common.errors.upload' },
  { match: /password|mot de passe/i, key: 'common.errors.password' },
  { match: /email/i, key: 'common.errors.email' },
];

const readMessage = (error) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return String(error?.message || error?.error || error?.reason || '');
};

export const getFriendlyError = (error, t, fallbackKey = 'common.errors.generic') => {
  const raw = readMessage(error);
  const rule = ERROR_RULES.find((item) => item.match.test(raw));
  return t(rule?.key || fallbackKey);
};
