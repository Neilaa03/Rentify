import { registerSchema, loginSchema } from './authSchema.js';
import { createUser, getUserByEmail } from './authModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

const login = async (req, res) => {
    try {
        // 1. Validate input
        const { email, password } = loginSchema.parse(req.body);
        console.log('Login attempt for email:', email);

        // 2. Find user & Verify password
        const user = await getUserByEmail(email);
        
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            console.log('Password mismatch for user:', email);
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // 3. Generate JWT
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'your-fallback-secret',
            { expiresIn: '24h' }
        );

        // Return user (without password_hash) and the token
        const { password_hash, ...userWithoutPassword } = user;
        res.json({
            user: userWithoutPassword,
            token
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(400).json({ error: err.message });
    }
};

export {
    register,
    login
};