import express from 'express';
import { register, login, me } from './authController.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, me);

router.get('/admin-dashboard', authenticateToken, requireRoles('admin'), (req, res) => {
    res.json({ message: 'Hello Admin' });
});

export default router;
