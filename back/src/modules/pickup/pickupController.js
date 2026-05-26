import { idParamSchema } from '../reservations/reservationSchemas.js';
import { verifyPickupSchema } from './pickupSchemas.js';
import { generatePickupPayload, getPickupPayloadStatus, verifyPickup } from './pickupModel.js';
import { getReservationById } from '../reservations/reservationModel.js';

const isStaff = (role) => ['admin', 'companyManager'].includes(role);

export const generatePickupCodeHandler = async (req, res) => {
  try {
    const { id: reservationId } = idParamSchema.parse(req.params);
    const reservation = await getReservationById(reservationId);
    const isRenter = reservation?.renterId === req.user.id;
    if (!isRenter && !isStaff(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const payload = await generatePickupPayload({ reservationId });
    res.status(201).json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getPickupPayloadForRenterHandler = async (req, res) => {
  try {
    const { id: reservationId } = idParamSchema.parse(req.params);
    const reservation = await getReservationById(reservationId);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

    if (reservation.renterId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const payload = await getPickupPayloadStatus({ reservationId });
    res.json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const verifyPickupCodeHandler = async (req, res) => {
  try {
    const { id: reservationId } = idParamSchema.parse(req.params);
    const reservation = await getReservationById(reservationId);

    const isOwner = reservation?.listing?.car?.ownerId === req.user.id;
    if (!isOwner && !isStaff(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { code, qrToken } = verifyPickupSchema.parse(req.body || {});
    const result = await verifyPickup({
      reservationId,
      verifierUserId: req.user.id,
      code,
      qrToken,
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
