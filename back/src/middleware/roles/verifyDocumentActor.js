export const verifyDocumentActor = (req, res, next) => {
  const allowedRoles = ['client', 'owner', 'companyManager', 'admin'];
  if (req.user && allowedRoles.includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({
    error: 'Access denied. Client, owner, companyManager or admin required.',
  });
};
