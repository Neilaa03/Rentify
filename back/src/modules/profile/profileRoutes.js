import express from 'express';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import { getMeClientStats, getMeStats } from './profileController.js';

const router = express.Router();

router.get('/me/stats', authenticateToken, requireRoles('owner'), getMeStats);
router.get('/me/client-stats', authenticateToken, requireRoles('client'), getMeClientStats);

export default router;
