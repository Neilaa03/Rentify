import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 1. Verify the Token
export const authenticateToken = (req, res, next) => {
    // Look for the token in the "Authorization" header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Token missing' });
    }

    try {
        // Check if the token is valid and not expired
        const payload = jwt.verify(token, JWT_SECRET);
        
        // Attach the user data (id and role) to the request object
        req.user = payload;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// 2. Check User Permissions
export const requireRoles = (...allowedRoles) => (req, res, next) => {
    // Ensure authenticateToken was called first
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if the user's role matches the required roles
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    return next();
};