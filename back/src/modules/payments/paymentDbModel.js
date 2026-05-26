import { supabase } from '../../config/supabase.js';

const PAYMENTS_TABLE = 'payments';
const RESERVATIONS_TABLE = 'reservations';

// =========================================================
// DTO CONVERSION
// =========================================================

const toPaymentDto = (row) => ({
    id: row.id,
    reservationId: row.reservation_id,
    amount: row.amount,
    paymentMethod: row.payment_method,
    stripePaymentIntentId: row.transaction_reference,
    transactionReference: row.transaction_reference,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const toPaymentTablePayload = (payload) => {
    const mapped = {};

    if (payload.reservationId !== undefined) mapped.reservation_id = payload.reservationId;
    if (payload.amount !== undefined) mapped.amount = payload.amount;
    if (payload.paymentMethod !== undefined) mapped.payment_method = payload.paymentMethod;
    if (payload.stripePaymentIntentId !== undefined) mapped.transaction_reference = payload.stripePaymentIntentId;
    if (payload.transactionReference !== undefined) mapped.transaction_reference = payload.transactionReference;
    if (payload.status !== undefined) mapped.status = payload.status;
    if (payload.paidAt !== undefined) mapped.paid_at = payload.paidAt;

    return mapped;
};

// =========================================================
// DATABASE FUNCTIONS
// =========================================================

export const createPayment = async (payload) => {
    if (!payload.reservationId || !payload.amount) {
        throw new Error('reservationId and amount are required');
    }

    const insertPayload = toPaymentTablePayload({
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
        .eq('transaction_reference', stripePaymentIntentId)
        .single();

    if (error || !data) return null;
    return toPaymentDto(data);
};

export const updatePaymentStatus = async (id, newStatus, updates = {}) => {
    const payload = toPaymentTablePayload({
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

export const updateReservationStatus = async (reservationId, newStatus) => {
    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .update({ status: newStatus })
        .eq('id', reservationId)
        .select()
        .single();

    if (error || !data) throw new Error('Failed to update reservation status');
    return data;
};
