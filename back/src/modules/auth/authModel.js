import { supabase } from '../../config/supabase.js';

const createUser = async (userData) => {
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

export { createUser };