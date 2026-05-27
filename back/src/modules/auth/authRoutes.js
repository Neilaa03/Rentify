import express from 'express';
import { register, login, me, updateMe } from './authController.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import { getUserById } from './authModel.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, me);
router.patch('/me', authenticateToken, updateMe);

// Protected route: Only logged-in users can see their data
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                role: user.role,
                is_verified: user.is_verified,
                is_active: user.is_active,
            },
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to load account' });
    }
});

// Admin-only route
router.get('/admin-dashboard', authenticateToken, requireRoles('admin'), (req, res) => {
    res.json({ message: 'Hello Admin' });
});

export default router;
