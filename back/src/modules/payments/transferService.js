import { stripe } from './paymentModel.js';

const assertStripeConfigured = () => {
  if (!stripe) {
    const error = new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.');
    error.statusCode = 500;
    throw error;
  }
};

export const createStripeTransfer = async ({
  amount,
  currency = 'eur',
  destinationAccountId,
  metadata = {},
  transferGroup,
  idempotencyKey,
}) => {
  assertStripeConfigured();

  if (!Number.isInteger(amount) || amount <= 0) {
    const error = new Error('amount must be a positive integer in the smallest currency unit.');
    error.statusCode = 400;
    throw error;
  }

  if (!destinationAccountId) {
    const error = new Error('destinationAccountId is required for transfers.');
    error.statusCode = 400;
    throw error;
  }

  return stripe.transfers.create({
    amount,
    currency: String(currency).toLowerCase(),
    destination: destinationAccountId,
    metadata,
    ...(transferGroup ? { transfer_group: transferGroup } : {}),
  }, idempotencyKey ? { idempotencyKey } : undefined);
};
