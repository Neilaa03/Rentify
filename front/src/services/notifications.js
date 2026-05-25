import storage from '../utils/storage';
import { fetchJson } from './api';

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const getToken = async () => {
  const token = await storage.getItemAsync('userToken');
  if (!token) throw new Error('User token missing');
  return token;
};

export const getNotifications = async ({ filter = 'all' } = {}) => {
  const token = await getToken();
  const query = filter === 'unread' ? '?filter=unread' : '';
  const data = await fetchJson(`/api/notifications${query}`, {
    headers: authHeaders(token),
  });
  return data.notifications || [];
};

export const getNotificationUnreadCount = async () => {
  const token = await getToken();
  const data = await fetchJson('/api/notifications/unread-count', {
    headers: authHeaders(token),
  });
  return data.count ?? 0;
};

export const markNotificationAsRead = async (notificationId) => {
  const token = await getToken();
  const data = await fetchJson(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  return data.notification;
};

export const markAllNotificationsAsRead = async () => {
  const token = await getToken();
  return fetchJson('/api/notifications/read-all', {
    method: 'PATCH',
    headers: authHeaders(token),
  });
};
