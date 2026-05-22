import { fetchJson } from './api';
import { Platform } from 'react-native';
import { getAuthToken, getCurrentUserProfile } from './authSession';
import { getOwnerListings } from './owner';

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

export const getOwnerClientsExpanded = async () => {
  const options = await withAuth();
  const token = await getAuthToken();
  const me = await getCurrentUserProfile();
  const ownerId = me?.id;

  // Owner clients (from reservations) does not include lastMessage, so we merge it
  // with the owner's actual conversations list.
  const [ownerClients, conversations] = await Promise.all([
    getOwnerClients().catch(() => []),
    getConversations().catch(() => []),
  ]);

  const convoByOtherId = new Map();
  (Array.isArray(conversations) ? conversations : []).forEach((c) => {
    const id = c?.otherUser?.id || c?.otherUserId;
    if (!id) return;
    convoByOtherId.set(String(id), c);
  });

  const byId = new Map();
  (Array.isArray(ownerClients) ? ownerClients : []).forEach((row) => {
    const id = row?.otherUser?.id || row?.otherUserId;
    if (!id) return;
    const convo = convoByOtherId.get(String(id)) || null;
    byId.set(String(id), {
      ...row,
      otherUserId: row?.otherUserId || id,
      hasMessages: Boolean(row?.hasMessages || convo),
      unreadCount: Math.max(Number(row?.unreadCount) || 0, Number(convo?.unreadCount) || 0),
      lastMessage: convo?.lastMessage || row?.lastMessage || null,
    });
  });

  // If for some reason ownerClients returns empty, still show conversations.
  (Array.isArray(conversations) ? conversations : []).forEach((c) => {
    const id = c?.otherUser?.id || c?.otherUserId;
    if (!id) return;
    const key = String(id);
    if (byId.has(key)) return;
    byId.set(key, c);
  });

  if (!token || !ownerId) return Array.from(byId.values());

  // Expand to include renters with no messages yet.
  try {
    const listings = await getOwnerListings({ token, ownerId });
    const listingIds = (listings || []).map((l) => l?.id).filter(Boolean);
    if (listingIds.length === 0) return Array.from(byId.values());

    const chunks = await Promise.all(
      listingIds.map(async (listingId) => {
        try {
          const data = await fetchJson(`/api/reservations/listing/${listingId}`, options);
          return Array.isArray(data) ? data : [];
        } catch (_e) {
          return [];
        }
      }),
    );

    const reservations = chunks.flat();
    reservations.forEach((r) => {
      const renter = r?.renter || null;
      const renterId = renter?.id || r?.renter_id || r?.renterId;
      if (!renterId) return;
      const key = String(renterId);
      if (byId.has(key)) return;

      byId.set(key, {
        otherUserId: renterId,
        otherUser: renter || { id: renterId },
        lastMessage: null,
        unreadCount: 0,
        hasMessages: false,
      });
    });
  } catch (_err) {
    // ignore
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aTime = new Date(a?.lastMessage?.createdAt || 0).getTime();
    const bTime = new Date(b?.lastMessage?.createdAt || 0).getTime();
    return bTime - aTime;
  });
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

export const uploadChatImage = async ({ uri }) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  if (!uri) throw new Error('Missing image uri');

  const formData = new FormData();
  const safeUri = String(uri);
  const extMatch = safeUri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = (extMatch?.[1] || 'jpg').toLowerCase();
  const filename = `chat_${Date.now()}.${ext}`;
  const mimeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  const mimeType = mimeMap[ext] || 'image/jpeg';

  if (Platform.OS === 'web') {
    // On web, FormData must receive a Blob/File, not { uri, name, type }.
    const blob = await fetch(uri).then((r) => r.blob());
    formData.append('image', blob, filename);
  } else {
    formData.append('image', {
      uri,
      name: filename,
      type: mimeType,
    });
  }

  const data = await fetchJson('/api/messages/upload-image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!data?.url) throw new Error('Upload failed');
  return data.url;
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
