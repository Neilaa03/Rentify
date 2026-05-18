import { constructWebhookEvent, createPaymentIntent } from './paymentService.js';

export const createPaymentIntentHandler = async (req, res) => {
  try {
    const { amount, currency, listingId, reservationId } = req.body || {};

    const metadata = {
      ...(listingId ? { listingId: String(listingId) } : {}),
      ...(reservationId ? { reservationId: String(reservationId) } : {}),
      ...(req.user?.id ? { userId: String(req.user.id) } : {}),
    };

    const intent = await createPaymentIntent({
      amount: Number(amount),
      currency: currency || 'usd',
      metadata,
    });

    return res.status(201).json({
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message || 'Failed to create payment intent' });
  }
};

export const handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = constructWebhookEvent({
      rawBody: req.body,
      signature,
    });

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('Stripe webhook payment_intent.succeeded', {
          id: paymentIntent.id,
          metadata: paymentIntent.metadata,
        });
        // TODO: Mark reservation/booking as paid in DB.
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('Stripe webhook payment_intent.payment_failed', {
          id: paymentIntent.id,
          metadata: paymentIntent.metadata,
          last_payment_error: paymentIntent.last_payment_error?.message,
        });
        // TODO: Mark reservation/booking as payment_failed in DB.
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
