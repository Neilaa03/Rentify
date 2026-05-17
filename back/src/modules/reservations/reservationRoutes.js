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
    getListingReservations,
    updateReservationStatusHandler,
    getAllReservations,
    getListingAvailabilityHandler,
} from './reservationController.js';

const router = Router();

// =========================================================
// PUBLIC ROUTES (no authentication required)
// =========================================================

// PUBLIC: Get listing availability for calendar (blocked dates)
router.get('/calendar/availability/:listingId', getListingAvailabilityHandler);

// All other routes require authentication
router.use(authenticateToken);

// =========================================================
// CLIENT (RENTER) ROUTES
// =========================================================

// Create a new reservation
router.post('/', verifyClient, createReservationHandler);

// Get user's own reservations
router.get('/me', getUserReservations);

// Get specific reservation (with ownership validation in controller)
router.get('/:id', getReservationHandler);

// Cancel reservation
router.delete('/:id/cancel', verifyClient, cancelReservationHandler);

// Allow client to update reservation dates (only if status is 'reserved')
router.patch('/:id/details', verifyClient, updateReservationDetailsHandler);


// =========================================================
// OWNER / MANAGER ROUTES
// =========================================================

// Get all reservations for a specific listing
// MUST come before /:id to match specific route first
router.get('/listing/:listingId', verifyOwner, getListingReservations);

// Update reservation status (for owner/manager workflow)
router.patch('/:id/status', verifyOwner, updateReservationStatusHandler);


// =========================================================
// ADMIN ROUTES
// =========================================================

// Get all reservations in the system
router.get('/', verifyAdmin, getAllReservations);


export default router;
