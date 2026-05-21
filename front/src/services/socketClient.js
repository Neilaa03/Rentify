import { io } from 'socket.io-client';
import { buildApiUrl } from './api';
import { getAuthToken } from './authSession';

let socket = null;

const getSocketBaseUrl = () => {
  // buildApiUrl('/api') => http://host:3000/api
  // socket.io lives on the same origin, without the /api prefix
  const apiUrl = buildApiUrl('/api');
  return apiUrl.replace(/\/api\/?$/, '');
};

export const getSocket = async () => {
  if (socket && socket.connected) return socket;

  const token = await getAuthToken();
  const baseUrl = getSocketBaseUrl();

  if (!socket) {
    socket = io(baseUrl, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
      autoConnect: true,
    });
  } else {
    // Update token and reconnect if needed
    try {
      socket.auth = token ? { token } : {};
    } catch (_err) {
      // ignore
    }
    if (!socket.connected) socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (!socket) return;
  try {
    socket.disconnect();
  } catch (_err) {
    // ignore
  }
};

