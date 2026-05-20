import { Router } from 'express';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import {
  sendMessageHandler,
  getConversationsHandler,
  getOwnerClientsHandler,
  getInboxHandler,
  getThreadHandler,
  markReadHandler,
  markThreadReadHandler,
} from './messageController.js';

const router = Router();

router.use(authenticateToken);

// Send a message to a user
router.post('/', sendMessageHandler);

// Get conversation summaries
router.get('/conversations', getConversationsHandler);

// Owner: list all reservation clients (even if no chat yet)
router.get('/owner/clients', requireRoles('owner'), getOwnerClientsHandler);

// Get inbox (messages received)
router.get('/', getInboxHandler);

// Get thread with specific user
router.get('/thread/:userId', getThreadHandler);

// Mark message as read
router.patch('/:id/read', markReadHandler);

// Mark all messages from user as read
router.patch('/thread/:userId/read', markThreadReadHandler);

export default router;
