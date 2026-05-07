import { Router } from 'express';
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
router.post('/', createListingHandler);
router.put('/:id', updateListingHandler);
router.patch('/:id', updateListingHandler);
router.delete('/:id', deleteListingHandler);

export default router;
