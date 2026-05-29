import { supabase } from '../../config/supabase.js';
import { getUserBalance } from './balanceModel.js';
import { stripe } from './paymentModel.js';

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

export const resolveOwnerConnectStatus = async (ownerId) => {
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
      pendingBalance: 0,
      availableBalance: 0,
    };
  }

  let stripeAccountId = owner?.stripe_account_id || null;
  if (!stripeAccountId) {
    stripeAccountId = await findStripeAccountIdForOwner({ ownerId, email: owner.email });
  }

  if (!stripeAccountId) {
    const balance = await getUserBalance(ownerId);
    return {
      ownerId,
      stripeAccountId: null,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      cardPaymentsAvailable: false,
      pendingBalance: balance.pendingBalance,
      availableBalance: balance.availableBalance,
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

  const account = await stripe.accounts.retrieve(stripeAccountId);
  const balance = await getUserBalance(ownerId);
  return {
    ownerId,
    stripeAccountId,
    ...toConnectStatus(account),
    pendingBalance: balance.pendingBalance,
    availableBalance: balance.availableBalance,
    stripeColumnMissing,
  };
};

export const getOwnerStripeAccount = async (ownerId) => resolveOwnerConnectStatus(ownerId);

export const getStripeAccountIdForOwner = async ({ ownerId, email }) => findStripeAccountIdForOwner({ ownerId, email });

export const getOwnerProfileForConnect = async (ownerId) => {
  try {
    return await getUserStripeAccountId(ownerId);
  } catch (error) {
    if (isMissingStripeColumnError(error)) {
      return getUserBasicProfile(ownerId);
    }
    throw error;
  }
};

export const persistOwnerStripeAccountId = setUserStripeAccountId;
export const buildStripeAccountPrefill = buildAccountPrefill;
export const isMissingStripeColumn = isMissingStripeColumnError;
