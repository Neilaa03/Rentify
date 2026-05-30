import express from 'express';
import { register, login, googleAuth, me, updateMe, setPassword, uploadProfilePicture, removeProfilePicture, verifyEmail, resendVerification, forgotPassword, resetPasswordRedirect, resetPassword } from './authController.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import { getUserById } from './authModel.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import upload from '../../middleware/upload.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post(
    '/google',
    rateLimit({
        windowMs: 10 * 60 * 1000,
        max: 10,
        keyFn: (req) => `${req.ip || 'unknown'}:google`,
    }),
    googleAuth
);
router.get('/verify-email', verifyEmail);
router.post(
    '/forgot-password',
    rateLimit({
        windowMs: 10 * 60 * 1000,
        max: 3,
        keyFn: (req) => `${req.ip || 'unknown'}:${String(req.body?.email || '').toLowerCase()}`,
    }),
    forgotPassword
);
router.get('/reset-password', resetPasswordRedirect);
router.post(
    '/reset-password',
    rateLimit({
        windowMs: 10 * 60 * 1000,
        max: 5,
        keyFn: (req) => `${req.ip || 'unknown'}:${String(req.body?.email || '').toLowerCase()}`,
    }),
    resetPassword
);
router.post(
    '/resend-verification',
    rateLimit({
        windowMs: 10 * 60 * 1000,
        max: 3,
        keyFn: (req) => `${req.ip || 'unknown'}:${String(req.body?.email || '').toLowerCase()}`,
    }),
    resendVerification
);
router.get('/me', authenticateToken, me);
router.patch('/me', authenticateToken, updateMe);
router.post('/set-password', authenticateToken, setPassword);
router.post('/me/profile-picture', authenticateToken, upload.single('image'), uploadProfilePicture);
router.delete('/me/profile-picture', authenticateToken, removeProfilePicture);

// Admin-only route
router.get('/admin-dashboard', authenticateToken, requireRoles('admin'), (req, res) => {
    res.json({ message: 'Hello Admin' });
});

export default router;
