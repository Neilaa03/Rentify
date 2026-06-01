import { getClientProfileStats, getOwnerProfileStats } from './profileModel.js';

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
