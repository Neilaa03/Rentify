import { registerSchema, loginSchema, updateMeSchema } from './authSchemas.js';
import { createUser, getUserByEmail, getUserById, updateUserById } from './authModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);

        const isVerified = ( validatedData.role === 'client' || validatedData.role === 'owner' );
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);

        const newUser = await createUser({
            ...validatedData,
            password: hashedPassword,
            isVerified: isVerified
        });

        const token = jwt.sign(
            { id: newUser.id, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: isVerified ? 'Registration complete' : 'Registration pending verification',
            user: newUser,
            token
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const login = async (req, res) => {
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

        // Return user profile (without password_hash) and the token
        // Fetch by id to ensure we have full profile fields even if email lookup is minimal.
        const profile = (await getUserById(user.id)) || user;
        const { password_hash, ...userWithoutPassword } = profile;
        res.json({
            user: userWithoutPassword,
            token
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(400).json({ error: err.message });
    }
};

export const me = async (req, res) => {
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

export const updateMe = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const payload = updateMeSchema.parse(req.body);
        const updated = await updateUserById(userId, payload);
        res.json({ user: updated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
