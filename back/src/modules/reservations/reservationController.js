import * as model from './reservationModel.js';
import {
    createReservationSchema,
    updateStatusSchema,
    idParamSchema
} from './reservationSchemas.js';

// =========================================================
// CLIENT (RENTER) HANDLERS
// =========================================================

// Create a new booking and set initial status to 'reserved'
export const createReservationHandler = async (req, res) => {
    try {
        const payload = createReservationSchema.parse(req.body);
        const result = await model.createReservation(payload, req.user.id);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getReservationHandler = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const reservation = await model.getReservationById(id);

        // Security: Only Renter, Car Owner, or Admin/Manager can view details
        const isRenter = reservation.renterId === req.user.id;
        const isOwner = reservation.listing?.car?.ownerId === req.user.id;
        const isStaff = ['admin', 'companyManager'].includes(req.user.role);

        if (!isRenter && !isOwner && !isStaff) {
            return res.status(403).json({ error: "Access denied." });
        }

        res.json(reservation);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

// Retrieve all bookings made by the logged-in client
export const getUserReservations = async (req, res) => {
    try {
        const result = await model.getReservationsByRenter(req.user.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Allow client to modify trip dates (Only if status is 'reserved')
export const updateReservationDetailsHandler = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const reservation = await model.getReservationById(id);

        // Security: Ownership check
        if (reservation.renterId !== req.user.id) {
            return res.status(403).json({ error: "Access denied." });
        }

        // Business Rule: Only 'reserved' bookings can be modified
        if (reservation.status !== 'reserved') {
            return res.status(400).json({ 
                error: `Cannot update a ${reservation.status} reservation.` 
            });
        }

        const result = await model.updateReservationDetails(id, req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Allow client to cancel their own booking
export const cancelReservationHandler = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const reservation = await model.getReservationById(id);

        // Security: Only the renter can cancel via this handler
        if (reservation.renterId !== req.user.id) {
            return res.status(403).json({ error: "You can only cancel your own bookings" });
        }

        const result = await model.updateReservationStatus(id, 'cancelled');
        res.json({ message: "Trip cancelled", result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// =========================================================
// OWNER / MANAGER HANDLERS
// =========================================================

// Retrieve all bookings for a specific car (Owner/Manager view)
export const getListingReservations = async (req, res) => {
    try {
        const { listingId } = req.params;
        const result = await model.getListingReservations(listingId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Owner/Admin updates status (Confirmed, Pickup_pending, etc.)
export const updateReservationStatusHandler = async (req, res) => {
    try {
        const { id } = idParamSchema.parse(req.params);
        const { status } = updateStatusSchema.parse(req.body);
        
        const result = await model.updateReservationStatus(id, status);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Global view for Admins to monitor all activity
export const getAllReservations = async (req, res) => {
    try {
        const result = await model.getReservations(req.query);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};