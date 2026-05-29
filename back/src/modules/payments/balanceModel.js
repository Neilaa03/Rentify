import { supabase } from '../../config/supabase.js';

const BALANCES_TABLE = 'user_balances';

const toNumber = (value) => Number(value || 0);

export const getUserBalance = async (userId) => {
  const { data, error } = await supabase
    .from(BALANCES_TABLE)
    .select('user_id, pending_balance, available_balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return {
    userId,
    pendingBalance: toNumber(data?.pending_balance),
    availableBalance: toNumber(data?.available_balance),
  };
};

export const ensureUserBalanceRow = async (userId) => {
  const existing = await getUserBalance(userId);
  if (existing) {
    const { data, error } = await supabase
      .from(BALANCES_TABLE)
      .upsert(
        {
          user_id: userId,
          pending_balance: existing.pendingBalance,
          available_balance: existing.availableBalance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('user_id, pending_balance, available_balance')
      .single();

    if (error) throw error;
    return {
      userId: data.user_id,
      pendingBalance: toNumber(data.pending_balance),
      availableBalance: toNumber(data.available_balance),
    };
  }

  const { data, error } = await supabase
    .from(BALANCES_TABLE)
    .insert([
      {
        user_id: userId,
        pending_balance: 0,
        available_balance: 0,
      },
    ])
    .select('user_id, pending_balance, available_balance')
    .single();

  if (error) throw error;
  return {
    userId: data.user_id,
    pendingBalance: toNumber(data.pending_balance),
    availableBalance: toNumber(data.available_balance),
  };
};

export const adjustUserBalance = async ({ userId, pendingDelta = 0, availableDelta = 0 }) => {
  const current = await getUserBalance(userId);
  const payload = {
    user_id: userId,
    pending_balance: Number((current.pendingBalance + pendingDelta).toFixed(2)),
    available_balance: Number((current.availableBalance + availableDelta).toFixed(2)),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(BALANCES_TABLE)
    .upsert(payload, { onConflict: 'user_id' })
    .select('user_id, pending_balance, available_balance')
    .single();

  if (error || !data) throw error || new Error('Failed to update user balance');
  return {
    userId: data.user_id,
    pendingBalance: toNumber(data.pending_balance),
    availableBalance: toNumber(data.available_balance),
  };
};
