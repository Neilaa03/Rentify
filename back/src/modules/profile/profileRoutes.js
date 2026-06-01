import express from 'express';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import { getMeStats } from './profileController.js';

const router = express.Router();

router.get('/me/stats', authenticateToken, requireRoles('owner'), getMeStats);

export default router;

