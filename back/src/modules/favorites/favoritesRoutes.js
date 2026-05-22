import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  addFavoriteHandler,
  getFavoritesHandler,
  getFavoriteStatusHandler,
  removeFavoriteHandler,
} from './favoritesController.js';

const router = Router();

router.get('/', authenticateToken, getFavoritesHandler);
router.get('/:listingId', authenticateToken, getFavoriteStatusHandler);
router.post('/:listingId', authenticateToken, addFavoriteHandler);
router.delete('/:listingId', authenticateToken, removeFavoriteHandler);

export default router;

