import { getOwnerProfileStats } from './profileModel.js';

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

