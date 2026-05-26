import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { verifyClient } from '../../middleware/roles/verifyClient.js';
import {
  carReviewSummaryHandler,
  createReservationReviewHandler,
  getReservationReviewHandler,
  listCarReviewsHandler,
} from './reviewController.js';

const router = Router();

// Public: list reviews for a car (prospects + owners)
router.get('/cars/:carId', listCarReviewsHandler);
router.get('/cars/:carId/summary', carReviewSummaryHandler);

// Authenticated: reservation review endpoints
router.use(authenticateToken);
router.get('/reservations/:reservationId', getReservationReviewHandler);
router.post('/reservations/:reservationId', verifyClient, createReservationReviewHandler);

export default router;

