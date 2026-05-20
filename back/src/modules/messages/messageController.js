import * as model from './messageModel.js';
import { getIO } from '../../socket/index.js';

export const sendMessageHandler = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, message } = req.body;
    if (!receiverId || !message) return res.status(400).json({ error: 'Missing fields' });

    const saved = await model.createMessage({ senderId, receiverId, message });

    try {
      const io = getIO();
      io.to(receiverId).emit('new_message', saved);
      io.to(senderId).emit('message_sent', saved);
    } catch (err) {
      // socket not initialized — ignore
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getConversationsHandler = async (req, res) => {
  try {
    const data = await model.getConversations(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getInboxHandler = async (req, res) => {
  try {
    const data = await model.getInbox(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getThreadHandler = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const data = await model.getThread(req.user.id, otherUserId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const markReadHandler = async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await model.markMessageRead(id);

    try {
      const io = getIO();
      io.to(updated.senderId).emit('message_read', updated);
      io.to(updated.receiverId).emit('message_read', updated);
    } catch (_err) {
      // ignore
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const markThreadReadHandler = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const updated = await model.markThreadRead({ userId: req.user.id, otherUserId });

    try {
      const io = getIO();
      io.to(otherUserId).emit('thread_read', { otherUserId: req.user.id, messageIds: updated.map((m) => m.id) });
      io.to(req.user.id).emit('thread_read', { otherUserId, messageIds: updated.map((m) => m.id) });
    } catch (_err) {
      // ignore
    }

    res.json({ updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getOwnerClientsHandler = async (req, res) => {
  try {
    const data = await model.getOwnerClients({ ownerId: req.user.id });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
