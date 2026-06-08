import express from 'express';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import { changeMePassword, getMeClientStats, getMeStats } from './profileController.js';

const router = express.Router();

/**
 * @openapi
 * /api/profile/me/stats:
 *   get:
 *     tags: [Profile]
 *     summary: Get owner profile stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats payload
 */
router.get('/me/stats', authenticateToken, requireRoles('owner'), getMeStats);
/**
 * @openapi
 * /api/profile/me/client-stats:
 *   get:
 *     tags: [Profile]
 *     summary: Get client profile stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client stats payload
 */
router.get('/me/client-stats', authenticateToken, requireRoles('client'), getMeClientStats);
/**
 * @openapi
 * /api/profile/me/password:
 *   post:
 *     tags: [Profile]
 *     summary: Change current user's password
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post('/me/password', authenticateToken, requireRoles('client', 'owner'), changeMePassword);

export default router;
