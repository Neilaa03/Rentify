import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { chatWithAssistant } from './assistantController.js';

const router = Router();

/**
 * @openapi
 * /api/assistant/chat:
 *   post:
 *     tags: [Assistant]
 *     summary: Chat with the assistant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assistant response
 */
router.post('/chat', authenticateToken, chatWithAssistant);

export default router;
