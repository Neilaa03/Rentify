import { registerSchema } from './authSchema.js';
import { createUser } from './authModel.js';
import bcrypt from 'bcrypt';

const register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);

        // 1. Logic to distinct verification needs
        // Clients are auto-verified; others stay 'false' for manual check
        const isVerified = validatedData.role === 'client';

        // 2. Hash the password
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);
        
        // 3. Save with the verification status
        const newUser = await createUser({
        ...validatedData,
        password: hashedPassword,
        isVerified: isVerified
        });

        res.status(201).json({
        message: isVerified ? "Registration complete" : "Registration pending verification",
        user: newUser
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export { register };