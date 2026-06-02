export const verifyAgencyOwner = (req, res, next) => {
  if (req.user && req.user.role === 'companyManager') {
    return next();
  }

  return res.status(403).json({
    error: 'Access denied. Agency owner permissions required.',
  });
};
