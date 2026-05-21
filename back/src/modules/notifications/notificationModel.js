import { supabase } from '../../config/supabase.js';

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

  return inserted;
};

export const getNotificationsForUser = async (userId, filter = 'all') => {
  let query = supabase
    .from(NOTIFICATIONS_TABLE)
    .select('*')
    .eq('user_id', userId)
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
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
};

export const markNotificationAsRead = async (notificationId, userId) => {
  const { data, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({ is_read: true })
    .match({ id: notificationId, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const markAllNotificationsAsRead = async (userId) => {
  const { error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({ is_read: true })
    .eq('user_id', userId);

  if (error) throw error;
  return true;
};
