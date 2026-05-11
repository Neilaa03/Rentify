import { supabase } from '../../config/supabase.js';

export const createUser = async (userData) => {
    const { email, password, firstName, lastName, phone, role, isVerified } = userData;

    // 1. Insert user into 'users'
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
        // 2. Select specific fields to return
        .select('id, email, first_name, last_name, role, is_verified')
        .single();

    // 3. Throw error to be caught by the controller
    if (error) throw error;
    return data;
};

export const getUserByEmail = async (email) => {
    // 1. Fetch user including the password_hash for comparison
    const { data, error } = await supabase
        .from('users')
        .select('id, email, password_hash, role, is_active, is_verified')
        .eq('email', email)
        .single();

    // 2. Return null if not found, otherwise return the user
    if (error) return null;
    return data;
};