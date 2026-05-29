import { registerSchema, loginSchema, updateMeSchema, resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema } from './authSchemas.js';
import {
    createUser,
    getUserByEmail,
    getUserById,
    updateUserById,
    setEmailVerificationToken,
    verifyEmailByToken,
    setPasswordResetToken,
    verifyPasswordResetToken,
    clearPasswordResetToken,
    updateUserPasswordHash,
} from './authModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../services/mailer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const APP_BASE_URL = process.env.APP_BASE_URL || '';
const PUBLIC_BACKEND_BASE_URL = process.env.PUBLIC_BACKEND_BASE_URL || '';
const APP_DEEP_LINK_BASE = process.env.APP_DEEP_LINK_BASE || '';
const DEV_HOST = String(process.env.DEV_HOST || '').trim();
const DEV_EXPO_PORT = Number(process.env.DEV_EXPO_PORT || 8081);
const EMAIL_VERIFICATION_TTL_MINUTES = Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES || 60 * 24);
const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);

const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

const formatValidationError = (err) => {
    const issues = err?.issues;
    if (!Array.isArray(issues) || issues.length === 0) return null;

    const fields = {};
    for (const issue of issues) {
        const key = Array.isArray(issue.path) && issue.path.length ? String(issue.path[0]) : 'form';
        if (!fields[key]) fields[key] = issue.message || 'Invalid value';
    }

    const first = issues[0];
    const firstField = Array.isArray(first.path) && first.path.length ? String(first.path[0]) : null;
    const message = firstField ? `${firstField}: ${first.message}` : (first.message || 'Invalid input');

    return { message, fields };
};

const formatAppError = (err) => {
    const validation = formatValidationError(err);
    if (validation) return { status: 400, ...validation };

    const rawMessage = String(err?.message || '');
    const code = String(err?.code || '');

    if (code === '23505' || rawMessage.toLowerCase().includes('duplicate key') || rawMessage.toLowerCase().includes('users_email')) {
        return { status: 409, message: 'Email already registered' };
    }

    if (rawMessage.includes('Email not configured.')) {
        return { status: 500, message: 'Email service is not configured' };
    }

    if (rawMessage.toLowerCase().includes('missing app_base_url')) {
        return { status: 500, message: 'Server configuration error' };
    }

    if (rawMessage.toLowerCase().includes('unable to determine public backend base url')) {
        return { status: 500, message: 'Server configuration error' };
    }

    return { status: 400, message: 'Request failed' };
};

const inferPublicBackendBaseUrlFromRequest = (req) => {
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
    const forwardedHost = String(req?.headers?.['x-forwarded-host'] || '').split(',')[0].trim();

    const proto = forwardedProto || req?.protocol;
    const host = forwardedHost || req?.get?.('host');

    if (!proto || !host) return '';
    return `${proto}://${host}`;
};

const inferPublicBackendBaseUrlFromDevHost = () => {
    if (!DEV_HOST) return '';
    const port = Number(process.env.PORT || 3000);
    return `http://${DEV_HOST}:${port}`;
};

const inferAppBaseUrlFromDevHost = () => {
    if (!DEV_HOST) return '';
    return `http://${DEV_HOST}:${DEV_EXPO_PORT}`;
};

const inferAppDeepLinkBaseFromDevHost = () => {
    if (!DEV_HOST) return '';
    return `exp://${DEV_HOST}:${DEV_EXPO_PORT}/--`;
};

const buildVerifyUrl = ({ req, email, token }) => {
    // Prefer sending users to the backend verify endpoint (works on mobile + web),
    // which can then redirect into the app via deep link.
    const base = (
        PUBLIC_BACKEND_BASE_URL ||
        inferPublicBackendBaseUrlFromRequest(req) ||
        inferPublicBackendBaseUrlFromDevHost() ||
        ''
    ).trim();

    if (!base) {
        throw new Error('Unable to determine public backend base URL (set PUBLIC_BACKEND_BASE_URL, or set DEV_HOST, or ensure Host header is present).');
    }

    return `${base.replace(/\/$/, '')}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&redirect=1`;
};

const buildResetUrl = ({ req, email, token }) => {
    const base = (
        PUBLIC_BACKEND_BASE_URL ||
        inferPublicBackendBaseUrlFromRequest(req) ||
        inferPublicBackendBaseUrlFromDevHost() ||
        ''
    ).trim();

    if (!base) {
        throw new Error('Unable to determine public backend base URL (set PUBLIC_BACKEND_BASE_URL, or set DEV_HOST, or ensure Host header is present).');
    }

    return `${base.replace(/\/$/, '')}/api/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&redirect=1`;
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

            const verifyUrl = buildVerifyUrl({ req, email: existing.email, token });
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

        const verifyUrl = buildVerifyUrl({ req, email: newUser.email, token });
        await sendVerificationEmail({ to: newUser.email, verifyUrl });

        res.status(201).json({
            message: 'Check your email to verify your account',
            user: newUser,
        });
    } catch (err) {
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
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
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
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

export const verifyEmail = async (req, res) => {
    try {
        const { email = '', token = '' } = req.query;
        const redirect = String(req.query.redirect || '').toLowerCase() === '1' || String(req.query.redirect || '').toLowerCase() === 'true';
        if (!email || !token) {
            return res.status(400).json({ error: 'Missing email or token' });
        }

        const tokenHash = hashToken(String(token));
        const result = await verifyEmailByToken({ email: String(email), tokenHash });

        if (redirect) {
            const appDeepLinkBase = (APP_DEEP_LINK_BASE || inferAppDeepLinkBaseFromDevHost() || '').trim();
            const appBaseUrl = (APP_BASE_URL || inferAppBaseUrlFromDevHost() || '').trim();

            if (!appDeepLinkBase) {
                // Fallback: redirect to app base url (web) with status params.
                if (!appBaseUrl) {
                    return res.status(500).json({ error: 'Server configuration error' });
                }
                const fallback = `${appBaseUrl.replace(/\/$/, '')}/?verified=${result.ok ? '1' : '0'}&reason=${encodeURIComponent(result.ok ? '' : (result.reason || 'FAILED'))}&email=${encodeURIComponent(String(email))}`;
                return res.redirect(302, fallback);
            }

            const deepLink = `${appDeepLinkBase.replace(/\/$/, '')}/verify-email?verified=${result.ok ? '1' : '0'}&reason=${encodeURIComponent(result.ok ? '' : (result.reason || 'FAILED'))}&email=${encodeURIComponent(String(email))}`;
            return res.redirect(302, deepLink);
        }

        if (!result.ok) {
            return res.status(400).json({ error: 'Verification failed' });
        }

        return res.json({ message: 'Email verified', user: result.user });
    } catch (err) {
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);
        const normalizedEmail = String(email || '').trim().toLowerCase();

        const user = await getUserByEmail(normalizedEmail);
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = hashToken(token);
            const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000).toISOString();

            await setPasswordResetToken({ userId: user.id, tokenHash, expiresAt });

            const resetUrl = buildResetUrl({ req, email: user.email, token });
            await sendPasswordResetEmail({ to: user.email, resetUrl });
        }

        // Always return generic response to avoid leaking which emails exist.
        return res.json({ message: 'If this email exists, a password reset link has been sent' });
    } catch (err) {
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
    }
};

export const resetPasswordRedirect = async (req, res) => {
    try {
        const { email = '', token = '' } = req.query;
        const redirect = String(req.query.redirect || '').toLowerCase() === '1' || String(req.query.redirect || '').toLowerCase() === 'true';

        if (!email || !token) {
            return res.status(400).json({ error: 'Missing email or token' });
        }

        if (redirect) {
            const appDeepLinkBase = (APP_DEEP_LINK_BASE || inferAppDeepLinkBaseFromDevHost() || '').trim();
            const appBaseUrl = (APP_BASE_URL || inferAppBaseUrlFromDevHost() || '').trim();

            if (!appDeepLinkBase) {
                if (!appBaseUrl) return res.status(500).json({ error: 'Server configuration error' });
                const fallback = `${appBaseUrl.replace(/\/$/, '')}/?reset=1&email=${encodeURIComponent(String(email))}&token=${encodeURIComponent(String(token))}`;
                return res.redirect(302, fallback);
            }

            const deepLink = `${appDeepLinkBase.replace(/\/$/, '')}/reset-password?email=${encodeURIComponent(String(email))}&token=${encodeURIComponent(String(token))}`;
            return res.redirect(302, deepLink);
        }

        return res.json({ email: String(email), token: String(token) });
    } catch (err) {
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, token, password } = resetPasswordSchema.parse(req.body);
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const tokenHash = hashToken(String(token));

        const check = await verifyPasswordResetToken({ email: normalizedEmail, tokenHash });
        if (!check.ok) {
            return res.status(400).json({ error: 'RESET_FAILED', reason: check.reason });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await updateUserPasswordHash({ userId: check.user.id, passwordHash });
        await clearPasswordResetToken({ userId: check.user.id });

        return res.json({ message: 'Password reset successful' });
    } catch (err) {
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
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

        const verifyUrl = buildVerifyUrl({ req, email: user.email, token });
        await sendVerificationEmail({ to: user.email, verifyUrl });

        return res.json({ message: 'Verification email sent' });
    } catch (err) {
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
    }
};
