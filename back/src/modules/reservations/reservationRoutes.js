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
    confirmHandoverHandler,
    disputeHandoverHandler,
    resolveEscrowDisputeHandler,
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

// PUBLIC: Get listing availability for calendar (blocked dates)
router.get('/calendar/availability/:listingId', getListingAvailabilityHandler);

// All other routes require authentication
router.use(authenticateToken);

// =========================================================
// SPECIFIC ROUTES (must come before generic /:id routes)
// =========================================================

// Create a new reservation
router.post('/', verifyClient, createReservationHandler);

// Get user's own reservations (specific route, must come before /:id)
router.get('/me', getUserReservations);

// Get all reservations for a specific listing (specific route, must come before /:id)
router.get('/listing/:listingId', verifyOwner, getListingReservations);

// Delete/Cancel reservation (specific route, must come before /:id)
router.delete('/:id/cancel', verifyClient, cancelReservationHandler);

// Patch: Confirm payment (update status from 'reserved' to 'confirmed')
router.patch('/:id/confirm-payment', verifyClient, confirmPaymentHandler);

// Post: Client confirms car handover and releases escrow
router.post('/:id/confirm-handover', verifyClient, confirmHandoverHandler);

// Post: Client disputes the handover and locks escrow
router.post('/:id/dispute', verifyClient, disputeHandoverHandler);

// Post: Admin resolves a dispute
router.post('/:id/dispute/resolve', verifyAdmin, resolveEscrowDisputeHandler);

// Patch: Update reservation dates (only if status is 'reserved')
router.patch('/:id/details', verifyClient, updateReservationDetailsHandler);

// Patch: Update reservation status (for owner/manager workflow)
router.patch('/:id/status', verifyOwner, updateReservationStatusHandler);

// Pickup flows (code generation / payload / verification)
router.use('/:id/pickup', pickupRoutes);

// Return flows (owner generates / client verifies)
router.use('/:id/return', returnRoutes);

// =========================================================
// GENERIC ROUTES (must come last)
// =========================================================

// Get all reservations in the system (admin only)
router.get('/', verifyAdmin, getAllReservations);

// Get specific reservation (with ownership validation in controller)
router.get('/:id', getReservationHandler);


export default router;
