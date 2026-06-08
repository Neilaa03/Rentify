import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { verifyOwner } from '../../middleware/roles/verifyOwner.js';
import {
  getAllListings,
  getListing,
  createListingHandler,
  updateListingHandler,
  deleteListingHandler,
} from './listingController.js';

const router = Router();

/**
 * @openapi
 * /api/listings:
 *   get:
 *     tags: [Listings]
 *     summary: List all listings
 *     responses:
 *       200:
 *         description: List of listings
 */
router.get('/', getAllListings);
/**
 * @openapi
 * /api/listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: Get a listing by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Listing details
 *   post:
 *     tags: [Listings]
 *     summary: Create a listing
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listing created
 *   put:
 *     tags: [Listings]
 *     summary: Replace a listing
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listing updated
 *   patch:
 *     tags: [Listings]
 *     summary: Update a listing
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listing updated
 *   delete:
 *     tags: [Listings]
 *     summary: Delete a listing
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listing deleted
 */
router.get('/:id', getListing);
router.post('/', authenticateToken, verifyOwner, createListingHandler);
router.put('/:id', authenticateToken, verifyOwner, updateListingHandler);
router.patch('/:id', authenticateToken, verifyOwner, updateListingHandler);
router.delete('/:id', authenticateToken, verifyOwner, deleteListingHandler);

export default router;
