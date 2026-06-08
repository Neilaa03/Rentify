import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getNotificationsHandler,
  getUnreadCountHandler,
  markNotificationAsReadHandler,
  markAllNotificationsHandler,
  deleteNotificationHandler,
} from './notificationController.js';

const router = Router();
router.use(authenticateToken);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications list
 */
router.get('/', getNotificationsHandler);
/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/unread-count', getUnreadCountHandler);
/**
 * @openapi
 * /api/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications updated
 */
router.patch('/read-all', markAllNotificationsHandler);
/**
 * @openapi
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification updated
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.patch('/:id/read', markNotificationAsReadHandler);
router.delete('/:id', deleteNotificationHandler);

export default router;
