import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { verifyClient } from '../../middleware/roles/verifyClient.js';
import { verifyOwner } from '../../middleware/roles/verifyOwner.js';
import { verifyAdmin } from '../../middleware/roles/verifyAdmin.js';
import {
    createReservationHandler,
    getReservationHandler,
    getUserReservations,
    updateReservationDetailsHandler,
    cancelReservationHandler,
    confirmPaymentHandler,
    getListingReservations,
    updateReservationStatusHandler,
    getAllReservations,
    getListingAvailabilityHandler,
} from './reservationController.js';
import pickupRoutes from '../pickup/pickupRoutes.js';
import returnRoutes from '../return/returnRoutes.js';

const router = Router();

// =========================================================
// PUBLIC ROUTES (no authentication required)
// =========================================================

/**
 * @openapi
 * /api/reservations/calendar/availability/{listingId}:
 *   get:
 *     tags: [Reservations]
 *     summary: Get availability for a listing calendar
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability data
 */
// PUBLIC: Get listing availability for calendar (blocked dates)
router.get('/calendar/availability/:listingId', getListingAvailabilityHandler);

// All other routes require authentication
router.use(authenticateToken);

// =========================================================
// SPECIFIC ROUTES (must come before generic /:id routes)
// =========================================================

// Create a new reservation
/**
 * @openapi
 * /api/reservations:
 *   post:
 *     tags: [Reservations]
 *     summary: Create a reservation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservation created
 *   get:
 *     tags: [Reservations]
 *     summary: List reservations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservations list
 */
router.post('/', verifyClient, createReservationHandler);

// Get user's own reservations (specific route, must come before /:id)
/**
 * @openapi
 * /api/reservations/me:
 *   get:
 *     tags: [Reservations]
 *     summary: Get the current user's reservations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User reservations
 */
router.get('/me', getUserReservations);

// Get all reservations for a specific listing (specific route, must come before /:id)
/**
 * @openapi
 * /api/reservations/listing/{listingId}:
 *   get:
 *     tags: [Reservations]
 *     summary: Get reservations for a listing
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
 *         description: Listing reservations
 */
router.get('/listing/:listingId', verifyOwner, getListingReservations);

// Delete/Cancel reservation (specific route, must come before /:id)
/**
 * @openapi
 * /api/reservations/{id}/cancel:
 *   delete:
 *     tags: [Reservations]
 *     summary: Cancel a reservation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservation cancelled
 */
router.delete('/:id/cancel', verifyClient, cancelReservationHandler);

// Patch: Confirm payment (update status from 'reserved' to 'confirmed')
/**
 * @openapi
 * /api/reservations/{id}/confirm-payment:
 *   patch:
 *     tags: [Reservations]
 *     summary: Confirm reservation payment
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment confirmed
 */
router.patch('/:id/confirm-payment', verifyClient, confirmPaymentHandler);

// Post: Client confirms car handover and releases escrow
/**
 * @openapi
 * /api/reservations/{id}/confirm-handover:
 *   post:
 *     tags: [Reservations]
 *     summary: Confirm car handover
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Handover confirmed
 */
router.post('/:id/confirm-handover', verifyClient, confirmHandoverHandler);

// Post: Client disputes the handover and locks escrow
/**
 * @openapi
 * /api/reservations/{id}/dispute:
 *   post:
 *     tags: [Reservations]
 *     summary: Dispute a handover
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dispute created
 */
router.post('/:id/dispute', verifyClient, disputeHandoverHandler);

// Post: Admin resolves a dispute
/**
 * @openapi
 * /api/reservations/{id}/dispute/resolve:
 *   post:
 *     tags: [Reservations]
 *     summary: Resolve a dispute
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dispute resolved
 */
router.post('/:id/dispute/resolve', verifyAdmin, resolveEscrowDisputeHandler);

// Patch: Update reservation dates (only if status is 'reserved')
/**
 * @openapi
 * /api/reservations/{id}/details:
 *   patch:
 *     tags: [Reservations]
 *     summary: Update reservation details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservation updated
 */
router.patch('/:id/details', verifyClient, updateReservationDetailsHandler);

// Patch: Update reservation status (for owner/manager workflow)
/**
 * @openapi
 * /api/reservations/{id}/status:
 *   patch:
 *     tags: [Reservations]
 *     summary: Update reservation status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservation status updated
 */
router.patch('/:id/status', verifyOwner, updateReservationStatusHandler);

// Pickup flows (code generation / payload / verification)
router.use('/:id/pickup', pickupRoutes);

// Return flows (owner generates / client verifies)
router.use('/:id/return', returnRoutes);

// =========================================================
// GENERIC ROUTES (must come last)
// =========================================================

// Get all reservations in the system (admin only)
/**
 * @openapi
 * /api/reservations:
 *   get:
 *     tags: [Reservations]
 *     summary: List all reservations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservations list
 */
router.get('/', verifyAdmin, getAllReservations);

// Get specific reservation (with ownership validation in controller)
/**
 * @openapi
 * /api/reservations/{id}:
 *   get:
 *     tags: [Reservations]
 *     summary: Get a reservation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservation details
 */
router.get('/:id', getReservationHandler);


export default router;
