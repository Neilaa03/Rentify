import { supabase } from '../../config/supabase.js';

const TABLE = 'messages';
const USERS_TABLE = 'users';
const LISTINGS_TABLE = 'listings';
const RESERVATIONS_TABLE = 'reservations';

const toDto = (row) => ({
  id: row.id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  message: row.message,
  isRead: row.is_read,
  createdAt: row.created_at,
});

const toUserDto = (row) => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  role: row.role,
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

export const getConversations = async (userId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;
  const rows = data || [];

  const conversationByOtherId = new Map();
  for (const row of rows) {
    const otherUserId = row.sender_id === userId ? row.receiver_id : row.sender_id;
    if (!otherUserId) continue;

    const existing = conversationByOtherId.get(otherUserId);
    if (!existing) {
      conversationByOtherId.set(otherUserId, {
        otherUserId,
        lastMessage: toDto(row),
        unreadCount:
          row.receiver_id === userId && row.is_read !== true
            ? 1
            : 0,
      });
      continue;
    }

    if (row.receiver_id === userId && row.is_read !== true) {
      existing.unreadCount += 1;
    }
  }

  const otherIds = Array.from(conversationByOtherId.keys());
  if (otherIds.length === 0) return [];

  const { data: users, error: usersError } = await supabase
    .from(USERS_TABLE)
    .select('id, first_name, last_name, email, phone, role')
    .in('id', otherIds);

  if (usersError) throw usersError;
  const userById = new Map((users || []).map((u) => [u.id, toUserDto(u)]));

  return otherIds
    .map((id) => {
      const convo = conversationByOtherId.get(id);
      return {
        otherUser: userById.get(id) || { id },
        lastMessage: convo.lastMessage,
        unreadCount: convo.unreadCount,
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.lastMessage?.createdAt || 0).getTime();
      const bTime = new Date(b.lastMessage?.createdAt || 0).getTime();
      return bTime - aTime;
    });
};

export const markMessageRead = async (id) => {
  const { data, error } = await supabase.from(TABLE).update({ is_read: true }).eq('id', id).select().single();
  if (error) throw error;
  return toDto(data);
};

export const markThreadRead = async ({ userId, otherUserId }) => {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_read: true })
    .eq('receiver_id', userId)
    .eq('sender_id', otherUserId)
    .eq('is_read', false)
    .select('*');

  if (error) throw error;
  return (data || []).map(toDto);
};

export const getOwnerClients = async ({ ownerId }) => {
  // 1) Find listing ids owned by this owner
  const { data: listingRows, error: listingError } = await supabase
    .from(LISTINGS_TABLE)
    .select('id, cars!inner(owner_id)')
    .eq('cars.owner_id', ownerId)
    .limit(1000);

  if (listingError) throw listingError;
  const listingIds = (listingRows || []).map((r) => r.id).filter(Boolean);
  if (listingIds.length === 0) return [];

  // 2) Fetch reservations renters for those listings
  const { data: reservationRows, error: resError } = await supabase
    .from(RESERVATIONS_TABLE)
    .select('renter_id, users(id, first_name, last_name, email, phone, role)')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (resError) throw resError;

  const renterById = new Map();
  for (const row of reservationRows || []) {
    const id = row?.users?.id || row?.renter_id;
    if (!id) continue;
    if (!renterById.has(id)) renterById.set(id, row.users ? toUserDto(row.users) : { id });
  }

  const renterIds = Array.from(renterById.keys());
  if (renterIds.length === 0) return [];

  // 3) Determine which renters already have at least 1 message with the owner
  const messagePairs = new Set();

  const { data: outMsgs, error: outErr } = await supabase
    .from(TABLE)
    .select('receiver_id')
    .eq('sender_id', ownerId)
    .in('receiver_id', renterIds)
    .limit(5000);
  if (outErr) throw outErr;
  (outMsgs || []).forEach((m) => {
    if (m?.receiver_id) messagePairs.add(m.receiver_id);
  });

  const { data: inMsgs, error: inErr } = await supabase
    .from(TABLE)
    .select('sender_id')
    .eq('receiver_id', ownerId)
    .in('sender_id', renterIds)
    .limit(5000);
  if (inErr) throw inErr;
  (inMsgs || []).forEach((m) => {
    if (m?.sender_id) messagePairs.add(m.sender_id);
  });

  // 4) Unread count per renter (messages sent by renter to owner that owner hasn't read)
  const { data: unreadRows, error: unreadErr } = await supabase
    .from(TABLE)
    .select('sender_id')
    .eq('receiver_id', ownerId)
    .eq('is_read', false)
    .in('sender_id', renterIds)
    .limit(5000);
  if (unreadErr) throw unreadErr;
  const unreadCountByRenter = new Map();
  (unreadRows || []).forEach((r) => {
    const senderId = r?.sender_id;
    if (!senderId) return;
    unreadCountByRenter.set(senderId, (unreadCountByRenter.get(senderId) || 0) + 1);
  });

  return renterIds.map((id) => ({
    otherUser: renterById.get(id) || { id },
    hasMessages: messagePairs.has(id),
    unreadCount: unreadCountByRenter.get(id) || 0,
  }));
};
