import { registerSchema, loginSchema } from './authSchema.js';
import { createUser, getUserByEmail, getUserById } from './authModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../middleware/auth.js';

const register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);

        const isVerified = ( validatedData.role === 'client' || validatedData.role === 'owner' );
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);

        const newUser = await createUser({
            ...validatedData,
            password: hashedPassword,
            isVerified: isVerified
        });

        res.status(201).json({
            message: isVerified ? 'Registration complete' : 'Registration pending verification',
            user: newUser
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        console.log('Login attempt for email:', email);

        const user = await getUserByEmail(email);

        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            console.log('Password mismatch for user:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

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

const me = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export {
    register,
    login,
    me
};
