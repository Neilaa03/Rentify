import { supabase } from '../../config/supabase.js';

const TABLE = 'messages';

const toDto = (row) => ({
  id: row.id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  message: row.message,
  isRead: row.is_read,
  createdAt: row.created_at,
});

export const createMessage = async ({ senderId, receiverId, message }) => {
  const payload = {
    sender_id: senderId,
    receiver_id: receiverId,
    message,
  };
  const { data, error } = await supabase.from(TABLE).insert([payload]).select().single();
  if (error) throw error;
  return toDto(data);
};

export const getInbox = async (userId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toDto);
};

export const getThread = async (userA, userB) => {
  const filter = `and(sender_id.in.(${userA},${userB}),receiver_id.in.(${userA},${userB}))`;
  // Use PostgREST-style OR to fetch both directions
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .or(`and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(toDto);
};

export const markMessageRead = async (id) => {
  const { data, error } = await supabase.from(TABLE).update({ is_read: true }).eq('id', id).select().single();
  if (error) throw error;
  return toDto(data);
};
