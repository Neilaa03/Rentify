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
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
