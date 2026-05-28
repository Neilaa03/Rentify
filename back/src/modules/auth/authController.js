import { registerSchema, loginSchema, resendVerificationSchema } from './authSchemas.js';
import {
    createUser,
    getUserByEmail,
    getUserById,
    setEmailVerificationToken,
    verifyEmailByToken,
} from './authModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendVerificationEmail } from '../../services/mailer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const APP_BASE_URL = process.env.APP_BASE_URL || '';
const EMAIL_VERIFICATION_TTL_MINUTES = Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES || 60 * 24);

const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

const buildVerifyUrl = ({ email, token }) => {
    if (!APP_BASE_URL) {
        throw new Error('Missing APP_BASE_URL env var.');
    }
    return `${APP_BASE_URL.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
};

export const register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);

        const isVerified = ( validatedData.role === 'client' || validatedData.role === 'owner' );
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);

        const existing = await getUserByEmail(validatedData.email);
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000).toISOString();

        // If email already exists:
        // - verified -> hard fail
        // - unverified -> resend (refresh token + expiry)
        if (existing) {
            if (existing.email_verified_at) {
                return res.status(409).json({ error: 'Email already registered' });
            }

            await setEmailVerificationToken({
                userId: existing.id,
                tokenHash,
                expiresAt,
            });

            const verifyUrl = buildVerifyUrl({ email: existing.email, token });
            await sendVerificationEmail({ to: existing.email, verifyUrl });

            return res.status(201).json({
                message: 'Check your email to verify your account',
            });
        }

        const newUser = await createUser({
            ...validatedData,
            password: hashedPassword,
            isVerified,
            emailVerifiedAt: null,
            emailVerificationTokenHash: tokenHash,
            emailVerificationExpiresAt: expiresAt,
        });

        const verifyUrl = buildVerifyUrl({ email: newUser.email, token });
        await sendVerificationEmail({ to: newUser.email, verifyUrl });

        res.status(201).json({
            message: 'Check your email to verify your account',
            user: newUser,
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

        if (!user.email_verified_at) {
            return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });
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

export const verifyEmail = async (req, res) => {
    try {
        const { email = '', token = '' } = req.query;
        if (!email || !token) {
            return res.status(400).json({ error: 'Missing email or token' });
        }

        const tokenHash = hashToken(String(token));
        const result = await verifyEmailByToken({ email: String(email), tokenHash });

        if (!result.ok) {
            return res.status(400).json({ error: 'VERIFICATION_FAILED', reason: result.reason });
        }

        return res.json({ message: 'Email verified', user: result.user });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

export const resendVerification = async (req, res) => {
    try {
        const { email } = resendVerificationSchema.parse(req.body);

        const user = await getUserByEmail(email);
        // Avoid leaking whether an account exists.
        if (!user) {
            return res.json({ message: 'If this email exists, a verification link has been sent' });
        }

        if (user.email_verified_at) {
            return res.json({ message: 'Email already verified' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000).toISOString();

        await setEmailVerificationToken({
            userId: user.id,
            tokenHash,
            expiresAt,
        });

        const verifyUrl = buildVerifyUrl({ email: user.email, token });
        await sendVerificationEmail({ to: user.email, verifyUrl });

        return res.json({ message: 'Verification email sent' });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
