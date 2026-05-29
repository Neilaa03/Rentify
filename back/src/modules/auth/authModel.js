import { supabase } from '../../config/supabase.js';

export const createUser = async (userData) => {
    const { email, password, firstName, lastName, phone, role, isVerified } = userData;

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
            is_active: true
        }
        ])
        .select('id, email, first_name, last_name, phone, role, is_verified, is_active, stripe_account_id')
        .single();

    if (error) throw error;
    return data;
};

export const getUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, password_hash, first_name, last_name, phone, role, is_active, is_verified, stripe_account_id')
        .eq('email', email)
        .single();

    if (error) return null;
    return data;
};

export const getUserById = async (id) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, role, is_active, is_verified, stripe_account_id')
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
