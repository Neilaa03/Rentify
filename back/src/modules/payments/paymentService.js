import { supabase } from '../../config/supabase.js';
import { createPaymentIntent, constructWebhookEvent } from './paymentModel.js';

const RESERVATIONS_TABLE = 'reservations';

const toSmallestCurrencyUnit = (amount) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error('Reservation total price is invalid.');
    error.statusCode = 400;
    throw error;
  }

  const cents = Math.round(numericAmount * 100);
  if (!Number.isInteger(cents) || cents <= 0) {
    const error = new Error('Reservation total price could not be converted to cents.');
    error.statusCode = 400;
    throw error;
  }

  return cents;
};

export const createReservationPaymentIntent = async ({ reservationId, userId, currency = 'eur' }) => {
  if (!reservationId) {
    const error = new Error('reservationId is required.');
    error.statusCode = 400;
    throw error;
  }

  const { data: reservation, error: reservationError } = await supabase
    .from(RESERVATIONS_TABLE)
    .select('id, renter_id, status, total_price, listing_id')
    .eq('id', reservationId)
    .single();

  if (reservationError || !reservation) {
    const error = new Error('Reservation not found.');
    error.statusCode = 404;
    throw error;
  }

  if (String(reservation.renter_id) !== String(userId)) {
    const error = new Error('You can only pay your own reservation.');
    error.statusCode = 403;
    throw error;
  }

  if (reservation.status !== 'reserved') {
    const error = new Error(`Payment cannot be created for a ${reservation.status} reservation.`);
    error.statusCode = 400;
    throw error;
  }

  const amount = toSmallestCurrencyUnit(reservation.total_price);

  const metadata = {
    reservationId: String(reservation.id),
    listingId: String(reservation.listing_id),
    userId: String(userId),
  };

  return createPaymentIntent({ amount, currency, metadata });
};

export { createPaymentIntent, constructWebhookEvent };
