import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2025-04-30.basil' })
  : null;

const assertStripeConfigured = () => {
  if (!stripe) {
    const error = new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.');
    error.statusCode = 500;
    throw error;
  }
};

export const createPaymentIntent = async ({ amount, currency = 'usd', metadata = {} }) => {
  assertStripeConfigured();

  if (!Number.isInteger(amount) || amount <= 0) {
    const error = new Error('amount must be a positive integer in the smallest currency unit.');
    error.statusCode = 400;
    throw error;
  }

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: String(currency).toLowerCase(),
    metadata,
    automatic_payment_methods: { enabled: true },
  });

  return intent;
};

export const constructWebhookEvent = ({ rawBody, signature }) => {
  assertStripeConfigured();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    const error = new Error('Missing STRIPE_WEBHOOK_SECRET.');
    error.statusCode = 500;
    throw error;
  }

  if (!signature) {
    const error = new Error('Missing Stripe signature header.');
    error.statusCode = 400;
    throw error;
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
};
