import express from 'express';
import { register, login, googleAuth, me, updateMe, setPassword, uploadProfilePicture, removeProfilePicture, verifyEmail, resendVerification, forgotPassword, resetPasswordRedirect, resetPassword } from './authController.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import { getUserById } from './authModel.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import upload from '../../middleware/upload.js';

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, confirmPassword, firstName, lastName, phone]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *               password: { type: string, example: Password123! }
 *               confirmPassword: { type: string, example: Password123! }
 *               firstName: { type: string, example: John }
 *               lastName: { type: string, example: Doe }
 *               phone: { type: string, example: "+33123456789" }
 *     responses:
 *       200:
 *         description: User registered
 */
router.post('/register', register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *               password: { type: string, example: Password123! }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', login);
/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate with Google
 *     responses:
 *       200:
 *         description: Google auth successful
 * /api/auth/verify-email:
 *   get:
 *     tags: [Auth]
 *     summary: Verify an email address
 *     responses:
 *       200:
 *         description: Email verified
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Start password reset flow
 *     responses:
 *       200:
 *         description: Reset email sent
 * /api/auth/reset-password:
 *   get:
 *     tags: [Auth]
 *     summary: Redirect to reset password page
 *     responses:
 *       200:
 *         description: Redirect response
 *   post:
 *     tags: [Auth]
 *     summary: Complete password reset
 *     responses:
 *       200:
 *         description: Password reset
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend verification email
 *     responses:
 *       200:
 *         description: Verification resent
 * /api/auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: Update the current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User updated
 * /api/auth/set-password:
 *   post:
 *     tags: [Auth]
 *     summary: Set a password for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password set
 * /api/auth/me/profile-picture:
 *   post:
 *     tags: [Auth]
 *     summary: Upload a profile picture
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile picture uploaded
 *   delete:
 *     tags: [Auth]
 *     summary: Remove the current profile picture
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile picture removed
 * /api/auth/admin-dashboard:
 *   get:
 *     tags: [Auth]
 *     summary: Admin-only test route
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin response
 */
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
/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 */
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
