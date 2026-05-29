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

router.get('/', getNotificationsHandler);
router.get('/unread-count', getUnreadCountHandler);
router.patch('/read-all', markAllNotificationsHandler);
router.patch('/:id/read', markNotificationAsReadHandler);
router.delete('/:id', deleteNotificationHandler);

export default router;
