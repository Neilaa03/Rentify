import { supabase } from '../../config/supabase.js';
import { adjustUserBalance, getUserBalance } from '../payments/balanceModel.js';

const PAYMENTS_TABLE = 'payments';
const ESCROW_TABLE = 'escrow_transactions';
const toNumber = (value) => Number(value || 0);

const toPaymentDto = (row) => ({
  id: row.id,
  reservationId: row.reservation_id,
  amount: row.amount,
  paymentMethod: row.payment_method,
  paymentIntentId: row.payment_intent_id,
  stripePaymentIntentId: row.payment_intent_id || row.transaction_reference,
  stripeTransferId: row.stripe_transfer_id,
  escrowStatus: row.escrow_status,
  transactionReference: row.transaction_reference,
  status: row.status,
  paidAt: row.paid_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toPaymentPayload = (payload) => {
  const mapped = {};
  if (payload.reservationId !== undefined) mapped.reservation_id = payload.reservationId;
  if (payload.amount !== undefined) mapped.amount = payload.amount;
  if (payload.paymentMethod !== undefined) mapped.payment_method = payload.paymentMethod;
  if (payload.paymentIntentId !== undefined) mapped.payment_intent_id = payload.paymentIntentId;
  if (payload.stripePaymentIntentId !== undefined) mapped.payment_intent_id = payload.stripePaymentIntentId;
  if (payload.stripeTransferId !== undefined) mapped.stripe_transfer_id = payload.stripeTransferId;
  if (payload.escrowStatus !== undefined) mapped.escrow_status = payload.escrowStatus;
  if (payload.transactionReference !== undefined) mapped.transaction_reference = payload.transactionReference;
  if (payload.status !== undefined) mapped.status = payload.status;
  if (payload.paidAt !== undefined) mapped.paid_at = payload.paidAt;
  return mapped;
};

const toEscrowDto = (row) => ({
  id: row.id,
  reservationId: row.reservation_id,
  paymentIntentId: row.payment_intent_id,
  stripeTransferId: row.stripe_transfer_id,
  clientId: row.client_id,
  ownerId: row.owner_id,
  amount: row.amount,
  status: row.status,
  heldAt: row.held_at,
  releasedAt: row.released_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toEscrowPayload = (payload) => {
  const mapped = {};
  if (payload.reservationId !== undefined) mapped.reservation_id = payload.reservationId;
  if (payload.paymentIntentId !== undefined) mapped.payment_intent_id = payload.paymentIntentId;
  if (payload.stripeTransferId !== undefined) mapped.stripe_transfer_id = payload.stripeTransferId;
  if (payload.clientId !== undefined) mapped.client_id = payload.clientId;
  if (payload.ownerId !== undefined) mapped.owner_id = payload.ownerId;
  if (payload.amount !== undefined) mapped.amount = payload.amount;
  if (payload.status !== undefined) mapped.status = payload.status;
  if (payload.heldAt !== undefined) mapped.held_at = payload.heldAt;
  if (payload.releasedAt !== undefined) mapped.released_at = payload.releasedAt;
  return mapped;
};

export const createPayment = async (payload) => {
  if (!payload.reservationId || !payload.amount) {
    throw new Error('reservationId and amount are required');
  }

  const insertPayload = toPaymentPayload({
    ...payload,
    status: payload.status || 'pending',
    paymentMethod: payload.paymentMethod || 'card',
  });

  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return toPaymentDto(data);
};

export const getPaymentById = async (id) => {
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Payment not found');
  return toPaymentDto(data);
};

export const getPaymentByReservationId = async (reservationId) => {
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .select('*')
    .eq('reservation_id', reservationId)
    .single();

  if (error || !data) return null;
  return toPaymentDto(data);
};

export const getPaymentByStripeIntentId = async (stripePaymentIntentId) => {
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .select('*')
    .eq('payment_intent_id', stripePaymentIntentId)
    .single();

  if (error || !data) return null;
  return toPaymentDto(data);
};

export const updatePaymentStatus = async (id, newStatus, updates = {}) => {
  const payload = toPaymentPayload({
    status: newStatus,
    ...updates,
  });

  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error('Failed to update payment status');
  return toPaymentDto(data);
};

export const createEscrowTransaction = async (payload) => {
  const insertPayload = toEscrowPayload({
    ...payload,
    status: payload.status || 'held_in_escrow',
    heldAt: payload.heldAt || new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from(ESCROW_TABLE)
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return toEscrowDto(data);
};

export const getEscrowTransactionByReservationId = async (reservationId) => {
  const { data, error } = await supabase
    .from(ESCROW_TABLE)
    .select('*')
    .eq('reservation_id', reservationId)
    .maybeSingle();

  if (error) throw error;
  return data ? toEscrowDto(data) : null;
};

export const getEscrowTransactionByPaymentIntentId = async (paymentIntentId) => {
  const { data, error } = await supabase
    .from(ESCROW_TABLE)
    .select('*')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (error) throw error;
  return data ? toEscrowDto(data) : null;
};

export const updateEscrowTransaction = async (id, updates = {}) => {
  const payload = toEscrowPayload(updates);
  const { data, error } = await supabase
    .from(ESCROW_TABLE)
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error('Failed to update escrow transaction');
  return toEscrowDto(data);
};

export const updateEscrowTransactionByReservationId = async (reservationId, updates = {}) => {
  const payload = toEscrowPayload(updates);
  const { data, error } = await supabase
    .from(ESCROW_TABLE)
    .update(payload)
    .eq('reservation_id', reservationId)
    .select()
    .single();

  if (error || !data) throw new Error('Failed to update escrow transaction');
  return toEscrowDto(data);
};

export const upsertEscrowTransactionByReservationId = async (payload) => {
  const existing = await getEscrowTransactionByReservationId(payload.reservationId);
  if (existing) {
    return updateEscrowTransaction(existing.id, payload);
  }
  return createEscrowTransaction(payload);
};

export const getOwnerBalances = async (ownerId) => {
  const balance = await getUserBalance(ownerId);
  return {
    ownerId,
    pendingBalance: balance.pendingBalance,
    availableBalance: balance.availableBalance,
  };
};

export const adjustOwnerBalances = async ({ ownerId, pendingDelta = 0, availableDelta = 0 }) => {
  const data = await adjustUserBalance({ userId: ownerId, pendingDelta, availableDelta });
  return {
    ownerId: data.userId,
    pendingBalance: data.pendingBalance,
    availableBalance: data.availableBalance,
  };
};
