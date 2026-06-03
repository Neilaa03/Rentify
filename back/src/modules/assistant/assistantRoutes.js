import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { chatWithAssistant } from './assistantController.js';

const router = Router();

router.post('/chat', authenticateToken, chatWithAssistant);

export default router;
