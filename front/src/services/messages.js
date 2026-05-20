import { fetchJson } from './api';
import { getAuthToken } from './authSession';

const withAuth = async (options = {}) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': options?.headers?.['Content-Type'] || 'application/json',
    },
  };
};

export const getConversations = async () => {
  const options = await withAuth();
  return fetchJson('/api/messages/conversations', options);
};

export const getOwnerClients = async () => {
  const options = await withAuth();
  return fetchJson('/api/messages/owner/clients', options);
};

export const getThread = async ({ otherUserId }) => {
  const options = await withAuth();
  return fetchJson(`/api/messages/thread/${otherUserId}`, options);
};

export const sendMessage = async ({ receiverId, message }) => {
  const options = await withAuth({
    method: 'POST',
    body: JSON.stringify({ receiverId, message }),
  });
  return fetchJson('/api/messages', options);
};

export const markMessageRead = async ({ messageId }) => {
  const options = await withAuth({
    method: 'PATCH',
  });
  return fetchJson(`/api/messages/${messageId}/read`, options);
};

export const markThreadRead = async ({ otherUserId }) => {
  const options = await withAuth({
    method: 'PATCH',
  });
  const data = await fetchJson(`/api/messages/thread/${otherUserId}/read`, options);
  return data?.updated || [];
};
