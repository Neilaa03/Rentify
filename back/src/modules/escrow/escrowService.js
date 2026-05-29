import { getReservationById } from '../reservations/reservationModel.js';
import { resolveOwnerConnectStatus } from '../payments/connectService.js';
import { createStripeTransfer } from '../payments/transferService.js';
import {
  adjustOwnerBalances,
  createEscrowTransaction,
  getEscrowTransactionByReservationId,
  getOwnerBalances,
  getPaymentByReservationId,
  getPaymentByStripeIntentId,
  updateEscrowTransaction,
  updatePaymentStatus,
  upsertEscrowTransactionByReservationId,
} from './escrowDbModel.js';
import { stripe } from '../payments/paymentModel.js';
import { supabase } from '../../config/supabase.js';

const ESCROW_STATUSES = new Set(['held_in_escrow', 'disputed', 'released']);

const toCurrencyAmount = (amount) => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    const error = new Error('Invalid escrow amount.');
    error.statusCode = 400;
    throw error;
  }
  return Number(numeric.toFixed(2));
};

const toStripeAmount = (amount) => {
  const currencyAmount = toCurrencyAmount(amount);
  return Math.round(currencyAmount * 100);
};

const getReservationOwnerId = (reservation) =>
  reservation?.listing?.car?.ownerId ||
  reservation?.listing?.car?.owner_id ||
  reservation?.listing?.car?.owner?.id ||
  null;

export const ensureEscrowTransaction = async ({ reservation, payment, paymentIntent }) => {
  if (!reservation?.id || !payment?.id) {
    throw new Error('reservation and payment are required');
  }

  const ownerId = getReservationOwnerId(reservation);
  if (!ownerId) {
    throw new Error('Owner not found for reservation');
  }

  const existing = await getEscrowTransactionByReservationId(reservation.id);
  if (existing) return existing;

  return upsertEscrowTransactionByReservationId({
    reservationId: reservation.id,
    paymentIntentId: paymentIntent?.id || payment?.paymentIntentId || payment?.stripePaymentIntentId,
    clientId: reservation.renterId,
    ownerId,
    amount: payment.amount,
    status: 'held_in_escrow',
    heldAt: new Date().toISOString(),
  });
};

export const markPaymentHeldInEscrow = async ({ reservation, paymentIntent }) => {
  const payment = await getPaymentByReservationId(reservation.id);
  if (!payment) {
    throw new Error('Payment not found');
  }

  const escrow = await ensureEscrowTransaction({ reservation, payment, paymentIntent });

  if (payment.status === 'held_in_escrow' || payment.status === 'released') {
    return {
      payment,
      escrow,
      ownerBalances: await getOwnerBalances(escrow.ownerId),
    };
  }

  const updatedPayment = await updatePaymentStatus(payment.id, 'held_in_escrow', {
    paidAt: new Date().toISOString(),
    paymentIntentId: paymentIntent.id,
    stripePaymentIntentId: paymentIntent.id,
    escrowStatus: 'held_in_escrow',
    transactionReference: paymentIntent.id,
  });

  const ownerBalances = await adjustOwnerBalances({
    ownerId: escrow.ownerId,
    pendingDelta: toCurrencyAmount(payment.amount),
    availableDelta: 0,
  });

  return {
    payment: updatedPayment,
    escrow,
    ownerBalances,
  };
};

export const releaseEscrowForReservation = async ({ reservationId, actorUserId, reason = 'handover_confirmed' }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    const error = new Error('Reservation not found');
    error.statusCode = 404;
    throw error;
  }

  const payment = await getPaymentByReservationId(reservationId);
  if (!payment) {
    const error = new Error('Payment not found');
    error.statusCode = 404;
    throw error;
  }

  if (payment.status === 'released') {
    return {
      reservation,
      payment,
      escrow: await getEscrowTransactionByReservationId(reservationId),
      ownerBalances: await getOwnerBalances(getReservationOwnerId(reservation)),
    };
  }

  if (!ESCROW_STATUSES.has(payment.status) && payment.escrowStatus !== 'held_in_escrow') {
    const error = new Error(`Payment is not in escrow state.`);
    error.statusCode = 400;
    throw error;
  }

  const escrow = await ensureEscrowTransaction({ reservation, payment, paymentIntent: { id: payment.paymentIntentId || payment.stripePaymentIntentId } });
  if (escrow.status === 'released') {
    const ownerBalances = await getOwnerBalances(escrow.ownerId);
    return { reservation, payment, escrow, ownerBalances };
  }

  if (escrow.status === 'disputed') {
    const error = new Error('Escrow is disputed and cannot be released automatically.');
    error.statusCode = 400;
    throw error;
  }

  const ownerConnectStatus = await resolveOwnerConnectStatus(escrow.ownerId);
  if (!ownerConnectStatus?.stripeAccountId) {
    const error = new Error('Owner Stripe connected account is missing.');
    error.statusCode = 400;
    throw error;
  }

  const transferAmount = toStripeAmount(payment.amount);
  const transferMetadata = {
    reservationId: String(reservationId),
    paymentId: String(payment.id),
    paymentIntentId: String(payment.paymentIntentId || payment.stripePaymentIntentId || ''),
    actorUserId: actorUserId ? String(actorUserId) : '',
    reason,
  };

  const existingTransferId = escrow.stripeTransferId || payment.stripeTransferId || null;
  let transfer = null;

  if (existingTransferId) {
    transfer = stripe ? await stripe.transfers.retrieve(existingTransferId) : null;
  } else {
    transfer = await createStripeTransfer({
      amount: transferAmount,
      currency: 'eur',
      destinationAccountId: ownerConnectStatus.stripeAccountId,
      metadata: transferMetadata,
      transferGroup: String(reservationId),
      idempotencyKey: `escrow-release-${reservationId}`,
    });
  }

  const updatedPayment = await updatePaymentStatus(payment.id, 'released', {
    stripeTransferId: transfer?.id || existingTransferId,
    escrowStatus: 'released',
  });

  const updatedEscrow = await updateEscrowTransaction(escrow.id, {
    stripeTransferId: transfer?.id || existingTransferId,
    status: 'released',
    releasedAt: new Date().toISOString(),
  });

  const ownerBalances = await adjustOwnerBalances({
    ownerId: escrow.ownerId,
    pendingDelta: -toCurrencyAmount(payment.amount),
    availableDelta: toCurrencyAmount(payment.amount),
  });

  return {
    reservation,
    payment: updatedPayment,
    escrow: updatedEscrow,
    transfer,
    ownerBalances,
  };
};

export const disputeEscrowForReservation = async ({ reservationId, actorUserId, reason = 'client_reported_issue' }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    const error = new Error('Reservation not found');
    error.statusCode = 404;
    throw error;
  }

  const payment = await getPaymentByReservationId(reservationId);
  if (!payment) {
    const error = new Error('Payment not found');
    error.statusCode = 404;
    throw error;
  }

  const escrow = await ensureEscrowTransaction({ reservation, payment, paymentIntent: { id: payment.paymentIntentId || payment.stripePaymentIntentId } });
  if (escrow.status === 'released') {
    const error = new Error('Released escrow cannot be disputed.');
    error.statusCode = 400;
    throw error;
  }

  const updatedPayment = await updatePaymentStatus(payment.id, 'disputed', {
    escrowStatus: 'disputed',
  });

  const updatedEscrow = await updateEscrowTransaction(escrow.id, {
    status: 'disputed',
    releasedAt: null,
  });

  return {
    reservation,
    payment: updatedPayment,
    escrow: updatedEscrow,
    actorUserId,
    reason,
  };
};

export const resolveDisputedEscrowForReservation = async ({ reservationId, actorUserId, action = 'release' }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    const error = new Error('Reservation not found');
    error.statusCode = 404;
    throw error;
  }

  const payment = await getPaymentByReservationId(reservationId);
  if (!payment) {
    const error = new Error('Payment not found');
    error.statusCode = 404;
    throw error;
  }

  const escrow = await ensureEscrowTransaction({ reservation, payment, paymentIntent: { id: payment.paymentIntentId || payment.stripePaymentIntentId } });
  if (escrow.status !== 'disputed') {
    const error = new Error('Only disputed escrow can be resolved.');
    error.statusCode = 400;
    throw error;
  }

  if (action !== 'release') {
    return { reservation, payment, escrow, actorUserId, action, resolved: false };
  }

  await updateEscrowTransaction(escrow.id, {
    status: 'held_in_escrow',
  });

  const released = await releaseEscrowForReservation({
    reservationId,
    actorUserId,
    reason: 'admin_dispute_resolution',
  });

  return {
    ...released,
    resolved: true,
    action,
  };
};

export const syncPaymentSucceededIntent = async (paymentIntent) => {
  const reservationId = paymentIntent?.metadata?.reservationId;
  if (!reservationId) return null;

  const reservation = await getReservationById(reservationId);
  if (!reservation) return null;

  return markPaymentHeldInEscrow({ reservation, paymentIntent });
};

export const syncPaymentFailedIntent = async (paymentIntent) => {
  const payment = await getPaymentByStripeIntentId(paymentIntent.id);
  if (!payment) return null;

  return updatePaymentStatus(payment.id, 'failed', {
    transactionReference: paymentIntent.id,
    paymentIntentId: paymentIntent.id,
    stripePaymentIntentId: paymentIntent.id,
    escrowStatus: 'failed',
  });
};

export const syncTransferCreated = async (transfer) => {
  const reservationId = transfer?.metadata?.reservationId;
  if (!reservationId) return null;

  const escrow = await getEscrowTransactionByReservationId(reservationId);
  if (!escrow) return null;

  return updateEscrowTransaction(escrow.id, {
    stripeTransferId: transfer.id,
    status: 'released',
    releasedAt: transfer.created ? new Date(transfer.created * 1000).toISOString() : new Date().toISOString(),
  });
};

export const syncTransferFailed = async (transfer) => {
  const reservationId = transfer?.metadata?.reservationId;
  if (!reservationId) return null;

  const escrow = await getEscrowTransactionByReservationId(reservationId);
  if (!escrow) return null;

  return updateEscrowTransaction(escrow.id, {
    stripeTransferId: transfer.id,
    status: 'disputed',
  });
};

export const releaseEscrowsDue = async ({ cutoffDate }) => {
  const { data, error } = await supabase
    .from('escrow_transactions')
    .select('id, reservation_id, status, payment_intent_id, stripe_transfer_id, client_id, owner_id, amount, held_at, released_at, created_at')
    .eq('status', 'held_in_escrow')
    .lte('held_at', cutoffDate.toISOString());

  if (error) throw error;

  const results = [];
  for (const row of data || []) {
    try {
      const released = await releaseEscrowForReservation({
        reservationId: row.reservation_id,
        reason: 'auto_release_timeout',
      });
      results.push(released);
    } catch (releaseError) {
      results.push({ reservationId: row.reservation_id, error: releaseError.message });
    }
  }

  return results;
};
