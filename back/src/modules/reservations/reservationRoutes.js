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
} from './reservationController.js';

const router = Router();

// All routes require authentication
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

// Update reservation details (only if status is 'reserved')
router.patch('/:id/details', verifyClient, updateReservationDetailsHandler);

// Cancel reservation
router.delete('/:id/cancel', verifyClient, cancelReservationHandler);


// =========================================================
// OWNER / MANAGER ROUTES
// =========================================================

// Get all reservations for a specific listing
router.get('/listing/:listingId', verifyOwner, getListingReservations);

// Update reservation status (for owner/manager workflow)
router.patch('/:id/status', verifyOwner, updateReservationStatusHandler);


// =========================================================
// ADMIN ROUTES
// =========================================================

// Get all reservations in the system
router.get('/', verifyAdmin, getAllReservations);


export default router;
