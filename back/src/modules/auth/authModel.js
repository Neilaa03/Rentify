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
        .select('id, email, first_name, last_name, phone, role, is_verified, is_active')
        .single();

    if (error) throw error;
    return data;
};

export const getUserByEmail = async (email) => {
    // 1. Fetch user including the password_hash for comparison
    const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, password_hash, role, is_active, is_verified')
        .eq('email', email)
        .single();

    if (error) return null;
    return data;
};

export const getUserById = async (id) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, role, is_active, is_verified')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
};
