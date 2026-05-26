import * as model from './notificationModel.js';

export const getNotificationsHandler = async (req, res) => {
  try {
    const filter = req.query.filter === 'unread' ? 'unread' : 'all';
    const notifications = await model.getNotificationsForUser(req.user.id, filter);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUnreadCountHandler = async (req, res) => {
  try {
    const count = await model.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const markNotificationAsReadHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await model.markNotificationAsRead(id, req.user.id);
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const markAllNotificationsHandler = async (req, res) => {
  try {
    await model.markAllNotificationsAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteNotificationHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await model.deleteNotification(id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
