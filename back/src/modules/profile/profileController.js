import bcrypt from 'bcrypt';
import { z } from 'zod';
import { getClientProfileStats, getOwnerProfileStats } from './profileModel.js';
import { getUserById, getUserPasswordMetaById, updateUserPasswordHashAndProvider } from '../auth/authModel.js';

const changePasswordSchema = z.object({
  currentPassword: z.string().optional().default(''),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const getMeStats = async (req, res) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

    const stats = await getOwnerProfileStats({ ownerId });
    return res.json({ stats });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to load stats' });
  }
};

export const getMeClientStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const stats = await getClientProfileStats({ userId });
    return res.json({ stats });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to load stats' });
  }
};

export const changeMePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const security = await getUserPasswordMetaById(userId);
    if (!security) return res.status(404).json({ error: 'User not found' });

    if (security.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }

      const currentMatches = await bcrypt.compare(currentPassword, security.password_hash);
      if (!currentMatches) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const currentProvider = String(security.auth_provider || '').trim().toLowerCase();
    const nextProvider = currentProvider === 'google' ? 'hybrid' : (currentProvider || 'password');

    await updateUserPasswordHashAndProvider({ userId, passwordHash, authProvider: nextProvider });

    const user = await getUserById(userId);
    return res.json({ message: 'PASSWORD_UPDATED', user });
  } catch (err) {
    if (err?.name === 'ZodError' || Array.isArray(err?.issues)) {
      const firstIssue = err.issues?.[0];
      const message = firstIssue?.message || 'Invalid input';
      return res.status(400).json({ error: message, fields: { [firstIssue?.path?.[0] || 'form']: message } });
    }

    return res.status(400).json({ error: err.message || 'Unable to change password' });
  }
};
