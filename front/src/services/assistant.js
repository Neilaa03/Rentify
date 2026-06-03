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
  return fetchJson('/api/assistant/chat', {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    timeoutMs: 30000,
    body: JSON.stringify({
      message,
      conversationId,
      context,
    }),
  });
};
