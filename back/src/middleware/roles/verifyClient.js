export const verifyClient = (req, res, next) => {
    if (req.user && req.user.role === 'client') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Client account required.' });
    }
};
