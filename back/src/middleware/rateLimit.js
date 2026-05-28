const getClientIp = (req) => {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

export const rateLimit = ({ windowMs, max, keyFn } = {}) => {
  const windowMsValue = windowMs ?? 10 * 60 * 1000;
  const maxValue = max ?? 3;
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const baseKey = keyFn ? keyFn(req) : getClientIp(req);

    const bucket = buckets.get(baseKey) || [];
    const recent = bucket.filter((t) => now - t < windowMsValue);
    recent.push(now);
    buckets.set(baseKey, recent);

    if (recent.length > maxValue) {
      const retryAfterSeconds = Math.ceil((windowMsValue - (now - recent[0])) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'RATE_LIMITED',
        retryAfterSeconds,
      });
    }

    return next();
  };
};

