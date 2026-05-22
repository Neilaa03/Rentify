import {
  addFavorite,
  getUserFavorites,
  isListingFavorited,
  removeFavorite,
} from './favoritesModel.js';
import { listingIdParamSchema } from './favoritesSchemas.js';

const zodErrors = (error) => error.issues.map((item) => item.message);

export const getFavoritesHandler = async (req, res) => {
  try {
    const result = await getUserFavorites({ userId: req.user.id });
    res.json(result);
  } catch (err) {
    console.error('getFavoritesHandler Error:', err.message, err);
    res.status(500).json({ error: err.message || 'Failed to fetch favorites' });
  }
};

export const getFavoriteStatusHandler = async (req, res) => {
  try {
    const { listingId } = listingIdParamSchema.parse(req.params);
    const favorited = await isListingFavorited({ userId: req.user.id, listingId });
    res.json({ listingId, favorited });
  } catch (err) {
    console.error('getFavoriteStatusHandler Error:', err.message, err);
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(500).json({ error: err.message || 'Failed to get favorite status' });
  }
};

export const addFavoriteHandler = async (req, res) => {
  try {
    const { listingId } = listingIdParamSchema.parse(req.params);
    await addFavorite({ userId: req.user.id, listingId });
    res.status(201).json({ listingId, favorited: true });
  } catch (err) {
    console.error('addFavoriteHandler Error:', err.message, err);
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message || 'Failed to add favorite' });
  }
};

export const removeFavoriteHandler = async (req, res) => {
  try {
    const { listingId } = listingIdParamSchema.parse(req.params);
    await removeFavorite({ userId: req.user.id, listingId });
    res.json({ listingId, favorited: false });
  } catch (err) {
    console.error('removeFavoriteHandler Error:', err.message, err);
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message || 'Failed to remove favorite' });
  }
};

