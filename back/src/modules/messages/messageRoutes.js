import { Router } from 'express';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import upload from '../../middleware/upload.js';
import {
  sendMessageHandler,
  getConversationsHandler,
  getOwnerClientsHandler,
  getInboxHandler,
  getThreadHandler,
  markReadHandler,
  markThreadReadHandler,
  uploadChatImageHandler,
} from './messageController.js';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Send a message
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Message sent
 *   get:
 *     tags: [Messages]
 *     summary: Get inbox messages
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inbox messages
 */
// Send a message to a user
router.post('/', sendMessageHandler);

// Upload a chat image (saved on Cloudinary)
/**
 * @openapi
 * /api/messages/upload-image:
 *   post:
 *     tags: [Messages]
 *     summary: Upload a chat image
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Image uploaded
 * /api/messages/conversations:
 *   get:
 *     tags: [Messages]
 *     summary: Get conversation summaries
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations
 * /api/messages/owner/clients:
 *   get:
 *     tags: [Messages]
 *     summary: Get clients for an owner
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Owner clients
 * /api/messages/{id}/read:
 *   patch:
 *     tags: [Messages]
 *     summary: Mark a message as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Message marked read
 * /api/messages/thread/{userId}/read:
 *   patch:
 *     tags: [Messages]
 *     summary: Mark a whole thread as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thread marked read
 */
router.post('/upload-image', upload.single('image'), uploadChatImageHandler);

// Get conversation summaries
router.get('/conversations', getConversationsHandler);

// Owner: list all reservation clients (even if no chat yet)
router.get('/owner/clients', requireRoles('owner'), getOwnerClientsHandler);

// Get inbox (messages received)
router.get('/', getInboxHandler);

// Get thread with specific user
/**
 * @openapi
 * /api/messages/thread/{userId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get a thread with a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thread messages
 */
router.get('/thread/:userId', getThreadHandler);

// Mark message as read
router.patch('/:id/read', markReadHandler);

// Mark all messages from user as read
router.patch('/thread/:userId/read', markThreadReadHandler);

export default router;
