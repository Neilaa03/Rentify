const buckets = new Map();

const defaultKeyFn = (req) => req.ip || req.headers?.['x-forwarded-for'] || 'unknown';

export const rateLimit = ({ windowMs = 60 * 1000, max = 60, keyFn = defaultKeyFn, message } = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = String(keyFn(req) || defaultKeyFn(req));
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    buckets.set(key, current);

    if (current.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: message || 'Too many requests. Please try again later.',
      });
    }

    return next();
  };
};
