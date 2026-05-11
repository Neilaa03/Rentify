export const verifyOwner = (req, res, next) => {
    // Allows both Owners and Company Managers (since they both manage fleets)
    const allowed = ['owner', 'companyManager', 'admin'];
    if (req.user && allowed.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Owner permissions required.' });
    }
};