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
/**
 * @openapi
 * /api/reviews/cars/{carId}:
 *   get:
 *     tags: [Reviews]
 *     summary: List reviews for a car
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car reviews
 */
router.get('/cars/:carId', listCarReviewsHandler);
/**
 * @openapi
 * /api/reviews/cars/{carId}/summary:
 *   get:
 *     tags: [Reviews]
 *     summary: Get review summary for a car
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review summary
 */
router.get('/cars/:carId/summary', carReviewSummaryHandler);

// Authenticated: reservation review endpoints
router.use(authenticateToken);
/**
 * @openapi
 * /api/reviews/reservations/{reservationId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get review for a reservation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation review
 *   post:
 *     tags: [Reviews]
 *     summary: Create a review for a reservation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review created
 */
router.get('/reservations/:reservationId', getReservationReviewHandler);
router.post('/reservations/:reservationId', verifyClient, createReservationReviewHandler);

export default router;
