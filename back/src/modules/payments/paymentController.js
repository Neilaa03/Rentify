import {
  constructWebhookEvent,
  createAccountOnboardingLink,
  createConnectedAccount,
  createPaymentIntentWithDestination,
  getConnectedAccount,
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
import { supabase } from '../../config/supabase.js';

const USERS_TABLE = 'users';
const MISSING_STRIPE_COLUMN_CODE = '42703';

const getUserStripeAccountId = async (userId) => {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, first_name, last_name, phone, stripe_account_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data;
};

const setUserStripeAccountId = async ({ userId, stripeAccountId }) => {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({ stripe_account_id: stripeAccountId })
    .eq('id', userId)
    .select('id, email, first_name, last_name, phone, stripe_account_id')
    .single();

  if (error || !data) throw error || new Error('Failed to persist stripe account id');
  return data;
};

const getUserBasicProfile = async (userId) => {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, first_name, last_name, phone')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const isMissingStripeColumnError = (error) => error?.code === MISSING_STRIPE_COLUMN_CODE;

const buildAccountPrefill = (user) => {
  const firstName = user?.first_name?.trim();
  const lastName = user?.last_name?.trim();
  const phone = user?.phone?.trim();
  const email = user?.email?.trim();

  const individual = {};
  if (firstName) individual.first_name = firstName;
  if (lastName) individual.last_name = lastName;
  if (email) individual.email = email;
  if (phone) individual.phone = phone;

  return {
    business_type: 'individual',
    ...(Object.keys(individual).length > 0 ? { individual } : {}),
  };
};

const findStripeAccountIdForOwner = async ({ ownerId, email }) => {
  if (!stripe) return null;
  if (!ownerId && !email) return null;

  let startingAfter;
  do {
    const page = await stripe.accounts.list({ limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    const match = (page.data || []).find((account) => {
      const metadataOwnerId = account?.metadata?.platform_user_id;
      if (ownerId && metadataOwnerId === ownerId) return true;
      if (email && account?.email && account.email.toLowerCase() === String(email).toLowerCase()) return true;
      return false;
    });
    if (match?.id) return match.id;
    startingAfter = page.has_more && page.data.length ? page.data[page.data.length - 1].id : null;
  } while (startingAfter);

  return null;
};

const toConnectStatus = (account) => ({
  onboardingComplete: Boolean(account?.details_submitted),
  chargesEnabled: Boolean(account?.charges_enabled),
  payoutsEnabled: Boolean(account?.payouts_enabled),
  cardPaymentsAvailable: Boolean(account?.charges_enabled && account?.payouts_enabled),
});

const resolveOwnerConnectStatus = async (ownerId) => {
  let owner = null;
  let stripeColumnMissing = false;
  try {
    owner = await getUserStripeAccountId(ownerId);
  } catch (error) {
    if (isMissingStripeColumnError(error)) {
      stripeColumnMissing = true;
      owner = await getUserBasicProfile(ownerId);
    } else {
      throw error;
    }
  }

  if (!owner) {
    return {
      ownerId,
      stripeAccountId: null,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      cardPaymentsAvailable: false,
    };
  }

  let stripeAccountId = owner?.stripe_account_id || null;
  if (!stripeAccountId) {
    stripeAccountId = await findStripeAccountIdForOwner({ ownerId, email: owner.email });
  }

  if (!stripeAccountId) {
    return {
      ownerId,
      stripeAccountId: null,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      cardPaymentsAvailable: false,
      stripeColumnMissing,
    };
  }

  if (!stripeColumnMissing && !owner?.stripe_account_id) {
    try {
      await setUserStripeAccountId({ userId: ownerId, stripeAccountId });
    } catch (_e) {
      // non-blocking
    }
  }
  const account = await getConnectedAccount(stripeAccountId);
  return {
    ownerId,
    stripeAccountId,
    ...toConnectStatus(account),
    stripeColumnMissing,
  };
};

const SERVICE_FEE_PERCENT = 0.1;

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

    // Create Stripe PaymentIntent
    const stripeAmount = Math.round(amount * 100); // Convert to cents
    const metadata = {
      reservationId: String(reservationId),
      userId: String(userId),
      paymentId: String(payment.id),
    };

    const applicationFeeAmount = Math.round(stripeAmount * SERVICE_FEE_PERCENT);

    const intent = await createPaymentIntentWithDestination({
      amount: stripeAmount,
      currency: currency.toLowerCase(),
      metadata,
      destinationAccountId: ownerConnectStatus.stripeAccountId,
      applicationFeeAmount,
    });

    // Update payment with Stripe intent ID
    payment = await updatePaymentStatus(payment.id, 'pending', {
      stripePaymentIntentId: intent.id,
    });

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

export const createOwnerOnboardingLinkHandler = async (req, res) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

    let existing = null;
    let stripeColumnMissing = false;
    try {
      existing = await getUserStripeAccountId(ownerId);
    } catch (error) {
      if (isMissingStripeColumnError(error)) {
        stripeColumnMissing = true;
        existing = await getUserBasicProfile(ownerId);
      } else {
        throw error;
      }
    }
    if (!existing) return res.status(404).json({ error: `Owner not found for authenticated id ${ownerId}` });

    let stripeAccountId = existing.stripe_account_id || null;
    if (!stripeAccountId) {
      stripeAccountId = await findStripeAccountIdForOwner({ ownerId, email: existing.email });
    }

    if (!stripeAccountId) {
      const account = await createConnectedAccount({
        email: existing.email,
        metadata: { platform_user_id: ownerId },
        accountData: buildAccountPrefill(existing),
      });
      stripeAccountId = account.id;
      if (!stripeColumnMissing) {
        await setUserStripeAccountId({ userId: ownerId, stripeAccountId });
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
            const confirmedReservation = await updateReservationStatus(reservationId, 'confirmed');
            try {
              await createNotification({
                userId: confirmedReservation.renterId,
                type: 'payment_success',
                title: 'Paiement réussi',
                message: `Le paiement de votre réservation ${confirmedReservation.listing?.title || ''} a été effectué avec succès.`,
                data: { reservationId: confirmedReservation.id },
              });
            } catch (notifyError) {
              console.error('Failed to create payment success notification:', notifyError);
            }
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

    // If the reservation is using card payment and the payment is still pending,
    // verify the Stripe PaymentIntent status and sync it if completed or failed.
    if (
      payment.paymentMethod === 'card' &&
      payment.status === 'pending' &&
      payment.stripePaymentIntentId &&
      stripe
    ) {
      try {
        const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
        if (intent?.status === 'succeeded') {
          await updatePaymentStatus(payment.id, 'completed', {
            paidAt: new Date().toISOString(),
            transactionReference: payment.stripePaymentIntentId,
          });

          if (reservationId) {
            await updateReservationStatus(reservationId, 'confirmed');
          }

          payment = await getPaymentById(payment.id);
        } else if (intent?.status === 'requires_payment_method' || intent?.status === 'requires_confirmation' || intent?.status === 'processing') {
          // Keep pending state. No action needed.
        } else if (
          intent?.status === 'canceled' ||
          intent?.status === 'requires_payment_method'
        ) {
          await updatePaymentStatus(payment.id, 'failed', {
            transactionReference: payment.stripePaymentIntentId,
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
