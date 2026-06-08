import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  addFavoriteHandler,
  getFavoritesHandler,
  getFavoriteStatusHandler,
  removeFavoriteHandler,
} from './favoritesController.js';

const router = Router();

/**
 * @openapi
 * /api/favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: List favorite listings for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorites list
 */
router.get('/', authenticateToken, getFavoritesHandler);
/**
 * @openapi
 * /api/favorites/{listingId}:
 *   get:
 *     tags: [Favorites]
 *     summary: Check favorite status for a listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Favorite status
 *   post:
 *     tags: [Favorites]
 *     summary: Add a listing to favorites
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorite added
 *   delete:
 *     tags: [Favorites]
 *     summary: Remove a listing from favorites
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorite removed
 */
router.get('/:listingId', authenticateToken, getFavoriteStatusHandler);
router.post('/:listingId', authenticateToken, addFavoriteHandler);
router.delete('/:listingId', authenticateToken, removeFavoriteHandler);

export default router;
