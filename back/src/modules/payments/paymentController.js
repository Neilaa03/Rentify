import {
  constructWebhookEvent,
  createAccountOnboardingLink,
  createConnectedAccount,
  createPaymentIntent,
  stripe,
} from './paymentModel.js';
import {
    createPayment,
    getPaymentById,
    getPaymentByReservationId,
    getPaymentByStripeIntentId,
    updatePaymentStatus,
    updateReservationStatus,
} from './paymentDbModel.js';
import { getReservationById } from '../reservations/reservationModel.js';
import { createNotification } from '../notifications/notificationModel.js';
import {
  buildStripeAccountPrefill,
  getOwnerProfileForConnect,
  isMissingStripeColumn,
  getStripeAccountIdForOwner,
  persistOwnerStripeAccountId,
  resolveOwnerConnectStatus,
} from './connectService.js';
import {
  syncPaymentFailedIntent,
  syncPaymentSucceededIntent,
  syncTransferCreated,
  syncTransferFailed,
} from './escrowService.js';

const notifyOwnerReservationCreated = async ({ reservation, paymentMethod }) => {
  const ownerId = reservation?.listing?.car?.ownerId;
  if (!ownerId) return;

  const methodLabel = paymentMethod === 'cash' ? 'en espece' : 'par carte';

  await createNotification({
    userId: ownerId,
    type: 'reservation_created',
    title: 'Nouvelle reservation',
    message: `Nouvelle reservation pour ${reservation.listing?.title || 'votre annonce'} du ${reservation.startDate} au ${reservation.endDate}, paiement choisi ${methodLabel}.`,
    data: { reservationId: reservation.id, listingId: reservation.listingId, paymentMethod },
  });
};

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

    if (reservation.status !== 'reserved') {
      return res.status(400).json({
        error: `Payment cannot be created for a ${reservation.status} reservation.`,
      });
    }

    const ownerId = reservation?.listing?.car?.ownerId;
    if (!ownerId) {
      return res.status(400).json({ error: 'Owner not found for this reservation.' });
    }

    const ownerConnectStatus = await resolveOwnerConnectStatus(ownerId);
    if (!ownerConnectStatus.cardPaymentsAvailable || !ownerConnectStatus.stripeAccountId) {
      return res.status(400).json({
        error: 'Card payment is not available for this listing yet. Owner payout setup is incomplete.',
        ownerConnectStatus,
      });
    }

    // Check if payment already exists
    let payment = await getPaymentByReservationId(reservationId);
    
    let createdPayment = false;
    if (!payment) {
      // Create payment record
      payment = await createPayment({
        reservationId,
        amount,
        paymentMethod: 'card',
        status: 'pending',
      });
      createdPayment = true;
    } else if (payment.paymentMethod !== 'card') {
      return res.status(400).json({ error: 'This reservation is not using card payment.' });
    }

    if (createdPayment) {
      try {
        await notifyOwnerReservationCreated({ reservation, paymentMethod: 'card' });
      } catch (notifyError) {
        console.error('Failed to create reservation notification after card selection:', notifyError);
      }
    }

    if (payment.paymentIntentId && ['pending', 'held_in_escrow'].includes(payment.status)) {
      const existingIntent = stripe ? await stripe.paymentIntents.retrieve(payment.paymentIntentId) : null;
      return res.status(200).json({
        paymentId: payment.id,
        paymentIntentId: payment.paymentIntentId,
        clientSecret: existingIntent?.client_secret || null,
        amount: existingIntent?.amount || Math.round(Number(payment.amount) * 100),
        currency: existingIntent?.currency || currency,
        status: existingIntent?.status || payment.status,
        escrowStatus: payment.escrowStatus || payment.status,
      });
    }

    // Create Stripe PaymentIntent on the platform account. Funds stay in escrow until handover confirmation.
    const stripeAmount = Math.round(amount * 100);
    const metadata = {
      reservationId: String(reservationId),
      userId: String(userId),
      paymentId: String(payment.id),
      ownerId: String(ownerId),
    };

    const intent = await createPaymentIntent({
      amount: stripeAmount,
      currency: currency.toLowerCase(),
      metadata,
      transferGroup: String(reservationId),
    });

    // Update payment with Stripe intent ID and keep it held in escrow.
    payment = await updatePaymentStatus(payment.id, 'pending', {
      paymentIntentId: intent.id,
      stripePaymentIntentId: intent.id,
      escrowStatus: 'pending',
    });

    return res.status(201).json({
      paymentId: payment.id,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      escrowStatus: 'pending',
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message || 'Failed to create payment intent' });
  }
};

export const createOwnerOnboardingLinkHandler = async (req, res) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

    let existing = null;
    let stripeColumnMissing = false;
    try {
      existing = await getOwnerProfileForConnect(ownerId);
    } catch (error) {
      if (isMissingStripeColumn(error)) {
        stripeColumnMissing = true;
      } else {
        throw error;
      }
    }
    if (!existing) return res.status(404).json({ error: `Owner not found for authenticated id ${ownerId}` });

    let stripeAccountId = existing.stripe_account_id || null;
    if (!stripeAccountId) {
      stripeAccountId = await getStripeAccountIdForOwner({ ownerId, email: existing.email });
    }

    if (!stripeAccountId) {
      const account = await createConnectedAccount({
        email: existing.email,
        metadata: { platform_user_id: ownerId },
        accountData: buildStripeAccountPrefill(existing),
      });
      stripeAccountId = account.id;
      try {
        await persistOwnerStripeAccountId({ userId: ownerId, stripeAccountId });
      } catch (persistError) {
        if (!isMissingStripeColumn(persistError)) {
          throw persistError;
        }
      }
    }

    const fallbackUrl = process.env.STRIPE_CONNECT_RETURN_URL || 'https://example.com/stripe-connect';
    const link = await createAccountOnboardingLink({
      accountId: stripeAccountId,
      refreshUrl: fallbackUrl,
      returnUrl: fallbackUrl,
    });

    return res.json({ onboardingUrl: link.url, stripeAccountId, stripeColumnMissing });
  } catch (error) {
    console.error('Create owner onboarding link error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message || 'Failed to create onboarding link' });
  }
};

export const getOwnerConnectStatusHandler = async (req, res) => {
  try {
    const ownerId = req.params?.ownerId;
    if (!ownerId) return res.status(400).json({ error: 'ownerId is required' });

    const status = await resolveOwnerConnectStatus(ownerId);
    return res.json(status);
  } catch (error) {
    console.error('Get owner connect status error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message || 'Failed to get owner connect status' });
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
    
    let createdPayment = false;
    if (!payment) {
      // Create cash payment record with pending_cash status
      payment = await createPayment({
        reservationId,
        amount,
        paymentMethod: 'cash',
        status: 'pending_cash',
      });
      createdPayment = true;
    }

    if (createdPayment) {
      try {
        await notifyOwnerReservationCreated({ reservation, paymentMethod: 'cash' });
      } catch (notifyError) {
        console.error('Failed to create reservation notification after cash selection:', notifyError);
      }
    }

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

// export const handleStripeWebhook = async (req, res) => {
//   try {
//     const signature = req.headers['stripe-signature'];
//     const event = constructWebhookEvent({
//       rawBody: req.body,
//       signature,
//     });

//     console.log('Stripe webhook event:', event.type);

//     switch (event.type) {
//       case 'payment_intent.succeeded': {
//         const paymentIntent = event.data.object;
//         const { reservationId, paymentId } = paymentIntent.metadata || {};

//         console.log('Payment succeeded:', {
//           id: paymentIntent.id,
//           reservationId,
//           paymentId,
//         });

//         if (paymentId) {
//           // Update payment status to paid
//           await updatePaymentStatus(paymentId, 'completed', {
//             paidAt: new Date().toISOString(),
//             transactionReference: paymentIntent.id,
//           });

//           // Update reservation status to confirmed
//           if (reservationId) {
//             await updateReservationStatus(reservationId, 'confirmed');
//           }
//         }
//         break;
//       }

//       case 'payment_intent.payment_failed': {
//         const paymentIntent = event.data.object;
//         const { reservationId, paymentId } = paymentIntent.metadata || {};

//         console.log('Payment failed:', {
//           id: paymentIntent.id,
//           reservationId,
//           paymentId,
//           last_payment_error: paymentIntent.last_payment_error?.message,
//         });

//         if (paymentId) {
//           // Update payment status to failed
//           await updatePaymentStatus(paymentId, 'failed', {
//             transactionReference: paymentIntent.id,
//           });
//         }
//         break;
//       }

//       default:
//         console.log(`Unhandled Stripe event type: ${event.type}`);
//     }

//     return res.status(200).json({ received: true });
//   } catch (error) {
//     console.error('Stripe webhook verification failed:', error.message);
//     return res.status(400).json({ error: `Webhook Error: ${error.message}` });
//   }
// };

export const handleStripeWebhook = async (req, res) => {
  let event;

  // STEP 1: Verify the event authenticity immediately
  try {
    const signature = req.headers['stripe-signature'];
    event = constructWebhookEvent({
      rawBody: req.body,
      signature,
    });
  } catch (error) {
    console.error('Stripe webhook verification failed:', error.message);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }

  res.status(200).json({ received: true });
  setImmediate(async () => {
    try {
    console.log('Processing Stripe webhook event in background:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const { reservationId, paymentId, ownerId } = paymentIntent.metadata || {};

        console.log('Payment succeeded:', {
          id: paymentIntent.id,
          reservationId,
          paymentId,
          ownerId,
        });

        const syncResult = await syncPaymentSucceededIntent(paymentIntent);
        if (syncResult?.payment?.id) {
          const confirmedReservation = await getReservationById(reservationId);
          try {
            await createNotification({
              userId: confirmedReservation.renterId,
              type: 'payment_success',
              title: 'Paiement sécurisé',
              message: `Le paiement de votre réservation ${confirmedReservation.listing?.title || ''} est maintenant en escrow.`,
              data: { reservationId: confirmedReservation.id, paymentId: syncResult.payment.id },
            });
          } catch (notifyError) {
            console.error('Failed to create payment success notification:', notifyError);
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

        await syncPaymentFailedIntent(paymentIntent);
        if (paymentId) {
          await updatePaymentStatus(paymentId, 'failed', {
            transactionReference: paymentIntent.id,
            paymentIntentId: paymentIntent.id,
            stripePaymentIntentId: paymentIntent.id,
            escrowStatus: 'failed',
          });
        }
        break;
      }

      case 'transfer.created': {
        await syncTransferCreated(event.data.object);
        break;
      }

      case 'transfer.failed': {
        await syncTransferFailed(event.data.object);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  } catch (err) {
      console.error(err);
    }
  });
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
    const confirmedReservation = await updateReservationStatus(reservationId, 'confirmed');

    try {
      await createNotification({
        userId: confirmedReservation.renterId,
        type: 'payment_success',
        title: 'Paiement confirmé',
        message: `Le paiement pour votre réservation ${confirmedReservation.listing?.title || ''} a été confirmé.`,
        data: { reservationId: confirmedReservation.id },
      });
    } catch (notifyError) {
      console.error('Failed to create payment success notification:', notifyError);
    }

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

    // Allow renter or owner to view payment status
    const isRenter = reservation.renterId === userId;
    const isOwner = reservation.listing?.car?.ownerId === userId;

    if (!isRenter && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get payment
    let payment = await getPaymentByReservationId(reservationId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Sync Stripe state for card payments, including escrow and release status.
    if (payment.paymentMethod === 'card' && payment.stripePaymentIntentId && stripe) {
      try {
        const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
        if (intent?.status === 'succeeded') {
          if (payment.status === 'pending') {
            const syncResult = await syncPaymentSucceededIntent(intent);
            if (syncResult?.payment?.id) {
              payment = await getPaymentById(payment.id);
            }
          } else if (payment.status === 'held_in_escrow' || payment.escrowStatus === 'held_in_escrow') {
            payment = await getPaymentById(payment.id);
          }
        } else if (intent?.status === 'requires_payment_method' || intent?.status === 'requires_confirmation' || intent?.status === 'processing') {
          // Keep pending state. No action needed.
        } else if (
          intent?.status === 'canceled' ||
          intent?.status === 'requires_payment_method'
        ) {
          await updatePaymentStatus(payment.id, 'failed', {
            transactionReference: payment.stripePaymentIntentId,
            paymentIntentId: payment.stripePaymentIntentId,
            stripePaymentIntentId: payment.stripePaymentIntentId,
            escrowStatus: 'failed',
          });
          payment = await getPaymentById(payment.id);
        }
      } catch (intentError) {
        console.error('Stripe retrieve payment intent error:', intentError);
      }
    }

    return res.status(200).json(payment);
  } catch (error) {
    console.error('Get payment status error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message || 'Failed to get payment status' });
  }
};
