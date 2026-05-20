import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  sendMessageHandler,
  getInboxHandler,
  getThreadHandler,
  markReadHandler,
} from './messageController.js';

const router = Router();

router.use(authenticateToken);

// Send a message to a user
router.post('/', sendMessageHandler);

// Get inbox (messages received)
router.get('/', getInboxHandler);

// Get thread with specific user
router.get('/thread/:userId', getThreadHandler);

// Mark message as read
router.patch('/:id/read', markReadHandler);

export default router;
