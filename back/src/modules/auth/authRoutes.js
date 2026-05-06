import express from 'express';
import { register, login } from './authController.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';

const router = express.Router();

// POST http://localhost:3000/auth/register
router.post('/register', register);
router.post('/login', login);

// Protected route: Only logged-in users can see their data
router.get('/me', authenticateToken, (req, res) => {
    res.json({ message: "Welcome back!", userId: req.user.id });
});

// Admin-only route
router.get('/admin-dashboard', authenticateToken, requireRoles('admin'), (req, res) => {
    res.json({ message: "Hello Admin" });
});

export default router;