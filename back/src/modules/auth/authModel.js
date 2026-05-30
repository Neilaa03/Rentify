import { supabase } from '../../config/supabase.js';

export const createUser = async (userData) => {
    const {
        email,
        password = null,
        firstName = '',
        lastName = '',
        phone = '',
        role = 'client',
        isVerified,
        emailVerifiedAt = null,
        emailVerificationTokenHash = null,
        emailVerificationExpiresAt = null,
        googleSub = null,
        authProvider = null,
    } = userData;

    const { data, error } = await supabase
        .from('users')
        .insert([
        {
            email,
            password_hash: password,
            first_name: firstName,
            last_name: lastName,
            phone,
            role,
            is_verified: isVerified,
            email_verified_at: emailVerifiedAt,
            email_verification_token_hash: emailVerificationTokenHash,
            email_verification_expires_at: emailVerificationExpiresAt,
            google_sub: googleSub,
            auth_provider: authProvider,
            is_active: true
        }
        ])
        .select('id, email, first_name, last_name, phone, role, is_verified, email_verified_at, is_active, stripe_account_id')
        .single();

    if (error) throw error;
    return data;
};

export const getUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, password_hash, first_name, last_name, phone, role, is_active, is_verified, stripe_account_id, email_verified_at, email_verification_token_hash, email_verification_expires_at, password_reset_token_hash, password_reset_expires_at, google_sub, auth_provider')
        .eq('email', email)
        .single();

    if (error) return null;
    return data;
};

export const getUserById = async (id) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, role, is_active, is_verified, stripe_account_id, email_verified_at, auth_provider, google_sub')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
};

export const getUserAuthMetaById = async (id) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, auth_provider, google_sub')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
};

export const updateUserById = async (id, payload) => {
    const updatePayload = {};
    if (payload.email !== undefined) updatePayload.email = payload.email;
    if (payload.phone !== undefined) updatePayload.phone = payload.phone;

    const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select('id, email, first_name, last_name, phone, role, is_verified, is_active, stripe_account_id')
        .single();

    if (error) throw error;
    return data;
};

export const setEmailVerificationToken = async ({
    userId,
    tokenHash,
    expiresAt,
}) => {
    const { data, error } = await supabase
        .from('users')
        .update({
            email_verification_token_hash: tokenHash,
            email_verification_expires_at: expiresAt,
        })
        .eq('id', userId)
        .select('id, email, email_verified_at, email_verification_expires_at')
        .single();

    if (error) throw error;
    return data;
};

export const verifyEmailByToken = async ({ email, tokenHash }) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('id, email, email_verified_at, email_verification_token_hash, email_verification_expires_at')
        .eq('email', email)
        .single();

    if (error) return { ok: false, reason: 'NOT_FOUND' };
    if (user.email_verified_at) return { ok: true, user };
    if (!user.email_verification_token_hash || !user.email_verification_expires_at) {
        return { ok: false, reason: 'NO_TOKEN' };
    }

    const expiresAt = new Date(user.email_verification_expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
        return { ok: false, reason: 'EXPIRED' };
    }

    if (user.email_verification_token_hash !== tokenHash) {
        return { ok: false, reason: 'INVALID_TOKEN' };
    }

    const { data: verifiedUser, error: verifyError } = await supabase
        .from('users')
        .update({
            email_verified_at: new Date().toISOString(),
            email_verification_token_hash: null,
            email_verification_expires_at: null,
        })
        .eq('id', user.id)
        .select('id, email, first_name, last_name, phone, role, is_active, is_verified, email_verified_at')
        .single();

    if (verifyError) throw verifyError;
    return { ok: true, user: verifiedUser };
};

export const setPasswordResetToken = async ({ userId, tokenHash, expiresAt }) => {
    const { data, error } = await supabase
        .from('users')
        .update({
            password_reset_token_hash: tokenHash,
            password_reset_expires_at: expiresAt,
        })
        .eq('id', userId)
        .select('id, email, password_reset_expires_at')
        .single();

    if (error) throw error;
    return data;
};

export const verifyPasswordResetToken = async ({ email, tokenHash }) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('id, email, password_reset_token_hash, password_reset_expires_at')
        .eq('email', email)
        .single();

    if (error) return { ok: false, reason: 'NOT_FOUND' };
    if (!user.password_reset_token_hash || !user.password_reset_expires_at) return { ok: false, reason: 'NO_TOKEN' };

    const expiresAt = new Date(user.password_reset_expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
        return { ok: false, reason: 'EXPIRED' };
    }

    if (user.password_reset_token_hash !== tokenHash) {
        return { ok: false, reason: 'INVALID_TOKEN' };
    }

    return { ok: true, user };
};

export const clearPasswordResetToken = async ({ userId }) => {
    const { data, error } = await supabase
        .from('users')
        .update({
            password_reset_token_hash: null,
            password_reset_expires_at: null,
        })
        .eq('id', userId)
        .select('id')
        .single();

    if (error) throw error;
    return data;
};

export const updateUserPasswordHash = async ({ userId, passwordHash }) => {
    const { data, error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', userId)
        .select('id, email')
        .single();

    if (error) throw error;
    return data;
};

export const updateUserPasswordHashAndProvider = async ({ userId, passwordHash, authProvider }) => {
    const updatePayload = { password_hash: passwordHash };
    if (authProvider) updatePayload.auth_provider = authProvider;

    const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId)
        .select('id, email, auth_provider')
        .single();

    if (error) throw error;
    return data;
};

export const getUserByGoogleSub = async (googleSub) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, role, is_active, is_verified, stripe_account_id, email_verified_at, google_sub, auth_provider')
        .eq('google_sub', googleSub)
        .single();

    if (error) return null;
    return data;
};

export const linkGoogleToUser = async ({ userId, googleSub }) => {
    const { data, error } = await supabase
        .from('users')
        .update({
            google_sub: googleSub,
            auth_provider: 'hybrid',
        })
        .eq('id', userId)
        .select('id, email, google_sub, auth_provider')
        .single();

    if (error) throw error;
    return data;
};
