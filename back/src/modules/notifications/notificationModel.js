import { supabase } from '../../config/supabase.js';
import { getIO } from '../../socket/index.js';

const NOTIFICATIONS_TABLE = 'notifications';

export const createNotification = async ({ userId, type, title, message, data = {} }) => {
  const payload = {
    user_id: userId,
    type,
    title,
    message,
    data,
    is_read: false,
  };

  const { data: inserted, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  try {
    const io = getIO();
    io.to(userId).emit('notification_created', inserted);
  } catch (_err) {
    // socket not initialized — ignore
  }

  return inserted;
};

export const getNotificationsForUser = async (userId, filter = 'all') => {
  let query = supabase
    .from(NOTIFICATIONS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .not('is_read', 'is', null)
    .order('created_at', { ascending: false });

  if (filter === 'unread') {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
};

export const getUnreadCount = async (userId) => {
  const { count, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('is_read', 'is', null)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
};

export const markNotificationAsRead = async (notificationId, userId) => {
  const { data, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({ is_read: true })
    .match({ id: notificationId, user_id: userId })
    .not('is_read', 'is', null)
    .select()
    .single();

  if (error) throw error;

  try {
    const io = getIO();
    io.to(userId).emit('notification_read', { notificationId });
  } catch (_err) {
    // socket not initialized — ignore
  }

  return data;
};

export const markAllNotificationsAsRead = async (userId) => {
  const { error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({ is_read: true })
    .eq('user_id', userId)
    .not('is_read', 'is', null);

  if (error) throw error;

  try {
    const io = getIO();
    io.to(userId).emit('notifications_all_read', { userId });
  } catch (_err) {
    // socket not initialized — ignore
  }

  return true;
};

export const deleteNotification = async (notificationId, userId) => {
  const { data, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({ is_read: null })
    .match({ id: notificationId, user_id: userId })
    .select()
    .maybeSingle();

  if (error) throw error;

  try {
    const io = getIO();
    io.to(userId).emit('notification_deleted', { notificationId });
  } catch (_err) {
    // socket not initialized — ignore
  }

  return data || null;
};
