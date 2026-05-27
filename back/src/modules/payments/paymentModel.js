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

export const createPaymentIntentWithDestination = async ({
  amount,
  currency = 'usd',
  metadata = {},
  destinationAccountId,
  applicationFeeAmount,
}) => {
  assertStripeConfigured();

  if (!Number.isInteger(amount) || amount <= 0) {
    const error = new Error('amount must be a positive integer in the smallest currency unit.');
    error.statusCode = 400;
    throw error;
  }

  if (!destinationAccountId) {
    const error = new Error('destinationAccountId is required for destination charges.');
    error.statusCode = 400;
    throw error;
  }

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: String(currency).toLowerCase(),
    metadata,
    automatic_payment_methods: { enabled: true },
    transfer_data: { destination: destinationAccountId },
    application_fee_amount: applicationFeeAmount,
  });

  return intent;
};

export const createConnectedAccount = async ({ email, metadata = {}, accountData = {} }) => {
  assertStripeConfigured();

  return stripe.accounts.create({
    type: 'express',
    email,
    metadata,
    ...accountData,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
};

export const createAccountOnboardingLink = async ({ accountId, refreshUrl, returnUrl }) => {
  assertStripeConfigured();

  return stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: refreshUrl,
    return_url: returnUrl,
  });
};

export const getConnectedAccount = async (accountId) => {
  assertStripeConfigured();
  return stripe.accounts.retrieve(accountId);
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
