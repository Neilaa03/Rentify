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

router.get('/', getAllListings);
router.get('/:id', getListing);
router.post('/', authenticateToken, verifyOwner, createListingHandler);
router.put('/:id', authenticateToken, verifyOwner, updateListingHandler);
router.patch('/:id', authenticateToken, verifyOwner, updateListingHandler);
router.delete('/:id', authenticateToken, verifyOwner, deleteListingHandler);

export default router;
