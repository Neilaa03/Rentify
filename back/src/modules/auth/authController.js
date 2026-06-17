import { registerSchema, loginSchema, updateMeSchema, resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema, googleAuthSchema, setPasswordSchema } from './authSchemas.js';
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
    updateUserPasswordHashAndProvider,
    getUserAuthMetaById,
    getUserByGoogleSub,
    linkGoogleToUser,
    updateUserProfilePicture,
} from './authModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../services/mailer.js';
import { OAuth2Client } from 'google-auth-library';
import cloudinary from '../../config/cloudinary.js';

const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const APP_BASE_URL = process.env.APP_BASE_URL || '';
const PUBLIC_BACKEND_BASE_URL = process.env.PUBLIC_BACKEND_BASE_URL || '';
const APP_DEEP_LINK_BASE = process.env.APP_DEEP_LINK_BASE || '';
const DEV_HOST = String(process.env.DEV_HOST || '').trim();
const DEV_EXPO_PORT = Number(process.env.DEV_EXPO_PORT || 8081);
const EMAIL_VERIFICATION_TTL_MINUTES = Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES || 60 * 24);
const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);
const GOOGLE_CLIENT_IDS = [
    String(process.env.GOOGLE_CLIENT_ID || '').trim(),
    String(process.env.GOOGLE_ANDROID_CLIENT_ID || '').trim(),
    String(process.env.GOOGLE_IOS_CLIENT_ID || '').trim(),
    ...String(process.env.GOOGLE_CLIENT_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
].filter(Boolean);
const googleClient = new OAuth2Client();

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

const normalizeAppDeepLinkBase = (value) => {
    const base = String(value || '').trim();
    if (!base) return '';

    // Accept Expo Go dev URLs and custom app schemes.
    if (
        base.startsWith('exp://') ||
        base.startsWith('exps://') ||
        base.startsWith('rentify://')
    ) {
        return base;
    }

    return '';
};

const resolveAppDeepLinkBase = ({ overrideBase = '' } = {}) => {
    const normalizedOverride = normalizeAppDeepLinkBase(overrideBase);
    if (normalizedOverride) return normalizedOverride;

    const configuredBase = normalizeAppDeepLinkBase(APP_DEEP_LINK_BASE);
    if (configuredBase) return configuredBase;

    return inferAppDeepLinkBaseFromDevHost();
};

const buildVerifyUrl = ({ req, email, token, redirectBase = '' }) => {
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

    const redirectQuery = redirectBase ? `&appRedirectBase=${encodeURIComponent(redirectBase)}` : '';
    return `${base.replace(/\/$/, '')}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&redirect=1${redirectQuery}`;
};

const buildResetUrl = ({ req, email, token, redirectBase = '' }) => {
    const base = (
        PUBLIC_BACKEND_BASE_URL ||
        inferPublicBackendBaseUrlFromRequest(req) ||
        inferPublicBackendBaseUrlFromDevHost() ||
        ''
    ).trim();

    if (!base) {
        throw new Error('Unable to determine public backend base URL (set PUBLIC_BACKEND_BASE_URL, or set DEV_HOST, or ensure Host header is present).');
    }

    const redirectQuery = redirectBase ? `&appRedirectBase=${encodeURIComponent(redirectBase)}` : '';
    return `${base.replace(/\/$/, '')}/api/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&redirect=1${redirectQuery}`;
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

        const verifyUrl = buildVerifyUrl({
            req,
            email: existing.email,
            token,
            redirectBase: validatedData.redirectBase,
        });
            await sendVerificationEmail({ to: existing.email, verifyUrl });

            return res.status(201).json({
                message: 'Check your email to verify your account',
            });
        }

        const newUser = await createUser({
            ...validatedData,
            password: hashedPassword,
            isVerified: isVerified
        });

        const verifyUrl = buildVerifyUrl({
            req,
            email: newUser.email,
            token,
            redirectBase: validatedData.redirectBase,
        });
        await sendVerificationEmail({ to: newUser.email, verifyUrl });

        res.status(201).json({
            message: isVerified ? 'Registration complete' : 'Registration pending verification',
            user: newUser
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

        if (!user.password_hash) {
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

export const googleAuth = async (req, res) => {
    try {
        if (GOOGLE_CLIENT_IDS.length === 0) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const { idToken } = googleAuthSchema.parse(req.body);
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_IDS,
        });

        const payload = ticket.getPayload() || {};
        const googleSub = String(payload.sub || '').trim();
        const email = String(payload.email || '').trim().toLowerCase();

        if (!googleSub || !email) {
            return res.status(400).json({ error: 'Invalid Google token' });
        }

        let user = await getUserByGoogleSub(googleSub);
        if (!user) {
            const existing = await getUserByEmail(email);
            if (existing) {
                await linkGoogleToUser({ userId: existing.id, googleSub });
                user = (await getUserById(existing.id)) || existing;
            } else {
                const firstName = String(payload.given_name || '').trim() || String(payload.name || '').trim().split(' ')[0] || '';
                const lastName = String(payload.family_name || '').trim() || '';
                const emailVerifiedAt = new Date().toISOString();
                // Some DB schemas require password_hash NOT NULL. Generate a random one so the account
                // is effectively Google-first unless you later implement "set password".
                const randomPassword = crypto.randomBytes(32).toString('hex');
                const passwordHash = await bcrypt.hash(randomPassword, 10);

                user = await createUser({
                    email,
                    password: passwordHash,
                    firstName,
                    lastName,
                    phone: '',
                    role: 'client',
                    isVerified: true,
                    emailVerifiedAt,
                    googleSub,
                    authProvider: 'google',
                });
            }
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const profile = (await getUserById(user.id)) || user;
        const { password_hash, ...userWithoutPassword } = profile;
        return res.json({ user: userWithoutPassword, token });
    } catch (err) {
        // Help debugging in dev without leaking tokens.
        try {
            console.error('[googleAuth] failed:', err?.message || err);
        } catch {
            // ignore
        }

        const rawMessage = String(err?.message || '');
        const lower = rawMessage.toLowerCase();

        // Common Google auth failures: bad token, expired token, or wrong audience/client id.
        if (lower.includes('wrong recipient') || lower.includes('audience')) {
            return res.status(401).json({ error: 'GOOGLE_CLIENT_ID_MISMATCH' });
        }
        if (lower.includes('invalid token') || lower.includes('jwt') || lower.includes('token')) {
            return res.status(401).json({ error: 'GOOGLE_TOKEN_INVALID' });
        }

        // In dev, return the underlying message to unblock debugging.
        if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
            return res.status(400).json({ error: 'GOOGLE_AUTH_FAILED', message: rawMessage });
        }

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

export const setPassword = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { password } = setPasswordSchema.parse(req.body);
        const meta = await getUserAuthMetaById(userId);
        if (!meta) return res.status(404).json({ error: 'User not found' });

        const passwordHash = await bcrypt.hash(password, 10);
        const currentProvider = String(meta.auth_provider || '').trim().toLowerCase();
        const nextProvider = currentProvider === 'google' ? 'hybrid' : (currentProvider || 'password');

        await updateUserPasswordHashAndProvider({ userId, passwordHash, authProvider: nextProvider });
        return res.json({ message: 'PASSWORD_SET' });
    } catch (err) {
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
    }
};

export const uploadProfilePicture = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        if (!allowedImageMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type' });
        }

        const base64 = req.file.buffer.toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${base64}`;

        const uploadResult = await cloudinary.uploader.upload(dataURI, {
            folder: 'rentify/profile-pictures',
        });

        await updateUserProfilePicture({ userId, profilePicture: uploadResult.secure_url });
        const user = await getUserById(userId);
        return res.status(201).json({ user });
    } catch (err) {
        if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
            return res.status(400).json({ error: 'UPLOAD_PROFILE_PICTURE_FAILED', message: String(err?.message || err) });
        }
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
    }
};

export const removeProfilePicture = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await updateUserProfilePicture({ userId, profilePicture: null });
        const user = await getUserById(userId);
        return res.json({ user });
    } catch (err) {
        if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
            return res.status(400).json({ error: 'REMOVE_PROFILE_PICTURE_FAILED', message: String(err?.message || err) });
        }
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { email = '', token = '' } = req.query;
        const appRedirectBase = String(req.query.appRedirectBase || '').trim();
        const redirect = String(req.query.redirect || '').toLowerCase() === '1' || String(req.query.redirect || '').toLowerCase() === 'true';
        if (!email || !token) {
            return res.status(400).json({ error: 'Missing email or token' });
        }

        const tokenHash = hashToken(String(token));
        const result = await verifyEmailByToken({ email: String(email), tokenHash });

        if (redirect) {
            const appDeepLinkBase = resolveAppDeepLinkBase({ overrideBase: appRedirectBase });
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
        const appRedirectBase = String(req.query.appRedirectBase || '').trim();
        const redirect = String(req.query.redirect || '').toLowerCase() === '1' || String(req.query.redirect || '').toLowerCase() === 'true';

        if (!email || !token) {
            return res.status(400).json({ error: 'Missing email or token' });
        }

        if (redirect) {
            const appDeepLinkBase = resolveAppDeepLinkBase({ overrideBase: appRedirectBase });
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
        const { email, redirectBase } = resendVerificationSchema.parse(req.body);

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

        const verifyUrl = buildVerifyUrl({
            req,
            email: user.email,
            token,
            redirectBase,
        });
        await sendVerificationEmail({ to: user.email, verifyUrl });

        return res.json({ message: 'Verification email sent' });
    } catch (err) {
        const f = formatAppError(err);
        return res.status(f.status).json({ error: f.message, ...(f.fields ? { fields: f.fields } : {}) });
    }
};
