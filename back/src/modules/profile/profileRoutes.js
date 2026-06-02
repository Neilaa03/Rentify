import express from 'express';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import { changeMePassword, getMeClientStats, getMeStats } from './profileController.js';

const router = express.Router();

router.get('/me/stats', authenticateToken, requireRoles('owner'), getMeStats);
router.get('/me/client-stats', authenticateToken, requireRoles('client'), getMeClientStats);
router.post('/me/password', authenticateToken, requireRoles('client', 'owner'), changeMePassword);

export default router;
