export const verifyClient = (req, res, next) => {
  if (req.user && req.user.role === 'client') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Client account required.' });
};
