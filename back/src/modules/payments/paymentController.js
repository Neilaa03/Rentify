import { constructWebhookEvent, createPaymentIntent } from './paymentModel.js';
import {
    createPayment,
    getPaymentByReservationId,
    getPaymentByStripeIntentId,
    updatePaymentStatus,
    updateReservationStatus,
} from './paymentDbModel.js';
import { getReservationById } from '../reservations/reservationModel.js';

// =========================================================
// CARD PAYMENT: Create Payment Intent
// =========================================================

export const createCardPaymentIntentHandler = async (req, res) => {
  try {
    const { reservationId, amount, currency = 'eur' } = req.body || {};
    const userId = req.user?.id;

    if (!reservationId || !amount) {
      return res.status(400).json({ error: 'reservationId and amount are required' });
    }

    // Get reservation to verify it exists and belongs to the user
    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (reservation.renterId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if payment already exists
    let payment = await getPaymentByReservationId(reservationId);
    
    if (!payment) {
      // Create payment record
      payment = await createPayment({
        reservationId,
        amount,
        paymentMethod: 'card',
        status: 'pending',
      });
    }

    // Create Stripe PaymentIntent
    const stripeAmount = Math.round(amount * 100); // Convert to cents
    const metadata = {
      reservationId: String(reservationId),
      userId: String(userId),
      paymentId: String(payment.id),
    };

    const intent = await createPaymentIntent({
      amount: stripeAmount,
      currency: currency.toLowerCase(),
      metadata,
    });

    // Update payment with Stripe intent ID
    payment = await updatePaymentStatus(payment.id, 'pending', {
      stripePaymentIntentId: intent.id,
    });

    // Update reservation status to payment_pending
    await updateReservationStatus(reservationId, 'payment_pending');

    return res.status(201).json({
      paymentId: payment.id,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message || 'Failed to create payment intent' });
  }
};

// =========================================================
// CASH PAYMENT: Create Pending Cash Payment
// =========================================================

export const createCashPaymentHandler = async (req, res) => {
  try {
    const { reservationId, amount } = req.body || {};
    const userId = req.user?.id;

    if (!reservationId || !amount) {
      return res.status(400).json({ error: 'reservationId and amount are required' });
    }

    // Get reservation to verify it exists and belongs to the user
    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (reservation.renterId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if payment already exists
    let payment = await getPaymentByReservationId(reservationId);
    
    if (!payment) {
      // Create cash payment record with pending_cash status
      payment = await createPayment({
        reservationId,
        amount,
        paymentMethod: 'cash',
        status: 'pending_cash',
      });
    }

    // Update reservation status to pending_cash (waiting for owner confirmation)
    await updateReservationStatus(reservationId, 'pending_cash');

    return res.status(201).json({
      paymentId: payment.id,
      message: 'Cash payment pending. Owner will confirm on pickup.',
      status: 'pending_cash',
      reservationId,
    });
  } catch (error) {
    console.error('Create cash payment error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message || 'Failed to create cash payment' });
  }
};

// =========================================================
// STRIPE WEBHOOK: Handle Payment Events
// =========================================================

export const handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = constructWebhookEvent({
      rawBody: req.body,
      signature,
    });

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const { reservationId, paymentId } = paymentIntent.metadata || {};

        console.log('Payment succeeded:', {
          id: paymentIntent.id,
          reservationId,
          paymentId,
        });

        if (paymentId) {
          // Update payment status to paid
          await updatePaymentStatus(paymentId, 'completed', {
            paidAt: new Date().toISOString(),
            transactionReference: paymentIntent.id,
          });

          // Update reservation status to confirmed
          if (reservationId) {
            await updateReservationStatus(reservationId, 'confirmed');
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const { reservationId, paymentId } = paymentIntent.metadata || {};

        console.log('Payment failed:', {
          id: paymentIntent.id,
          reservationId,
          paymentId,
          last_payment_error: paymentIntent.last_payment_error?.message,
        });

        if (paymentId) {
          // Update payment status to failed
          await updatePaymentStatus(paymentId, 'failed', {
            transactionReference: paymentIntent.id,
          });
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook verification failed:', error.message);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
};

// =========================================================
// OWNER: Confirm Cash Payment
// =========================================================

export const confirmCashPaymentHandler = async (req, res) => {
  try {
    const { reservationId } = req.body || {};
    const ownerId = req.user?.id;

    if (!reservationId) {
      return res.status(400).json({ error: 'reservationId is required' });
    }

    // Get reservation
    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Verify owner
    if (reservation.listing?.car?.ownerId !== ownerId) {
      return res.status(403).json({ error: 'Unauthorized. Only car owner can confirm cash payment.' });
    }

    // Get payment
    const payment = await getPaymentByReservationId(reservationId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.paymentMethod !== 'cash') {
      return res.status(400).json({ error: 'This payment is not a cash payment' });
    }

    // Update payment status to completed
    const updatedPayment = await updatePaymentStatus(payment.id, 'completed', {
      paidAt: new Date().toISOString(),
    });

    // Update reservation status to confirmed
    await updateReservationStatus(reservationId, 'confirmed');

    return res.status(200).json({
      message: 'Cash payment confirmed',
      payment: updatedPayment,
    });
  } catch (error) {
    console.error('Confirm cash payment error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message || 'Failed to confirm cash payment' });
  }
};

// =========================================================
// GET PAYMENT STATUS
// =========================================================

export const getPaymentStatusHandler = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userId = req.user?.id;

    if (!reservationId) {
      return res.status(400).json({ error: 'reservationId is required' });
    }

    // Get reservation to verify user has access
    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (reservation.renterId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get payment
    const payment = await getPaymentByReservationId(reservationId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.status(200).json(payment);
  } catch (error) {
    console.error('Get payment status error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message || 'Failed to get payment status' });
  }
};

