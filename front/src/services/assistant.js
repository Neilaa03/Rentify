import { fetchJson } from './api';

const authHeaders = (token, extra = {}) => ({
  ...extra,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const sendAssistantMessage = async ({
  token,
  message,
  conversationId,
  context = [],
}) => {
  const payload = {
    message,
    context,
  };

  if (conversationId) {
    payload.conversationId = conversationId;
  }

  return fetchJson('/api/assistant/chat', {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    timeoutMs: 30000,
    body: JSON.stringify(payload),
  });
};
