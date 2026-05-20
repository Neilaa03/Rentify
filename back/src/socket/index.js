import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    // Attempt to authenticate using token sent in handshake auth
    const { token } = socket.handshake.auth || {};
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        // Attach user info to socket and join a room by user id
        socket.user = payload;
        socket.join(payload.id);
      } catch (err) {
        // invalid token — do not attach user but allow limited actions
      }
    }

    // Fallback: allow client to explicitly register (less secure)
    socket.on('register', (userId) => {
      if (!userId) return;
      socket.join(userId);
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket not initialized');
  return io;
};
