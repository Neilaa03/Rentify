import { idParamSchema } from '../reservations/reservationSchemas.js';
import { verifyReturnSchema } from './returnSchemas.js';
import { generateReturnPayload, getReturnPayloadStatus, verifyReturn } from './returnModel.js';
import { getReservationById } from '../reservations/reservationModel.js';

const isStaff = (role) => ['admin', 'companyManager'].includes(role);

export const generateReturnCodeHandler = async (req, res) => {
  try {
    const { id: reservationId } = idParamSchema.parse(req.params);
    const reservation = await getReservationById(reservationId);
    const isOwner = reservation?.listing?.car?.ownerId === req.user.id;
    if (!isOwner && !isStaff(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const payload = await generateReturnPayload({ reservationId });
    res.status(201).json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getReturnPayloadForOwnerHandler = async (req, res) => {
  try {
    const { id: reservationId } = idParamSchema.parse(req.params);
    const reservation = await getReservationById(reservationId);
    const isOwner = reservation?.listing?.car?.ownerId === req.user.id;
    if (!isOwner && !isStaff(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const payload = await getReturnPayloadStatus({ reservationId });
    res.json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const verifyReturnCodeHandler = async (req, res) => {
  try {
    const { id: reservationId } = idParamSchema.parse(req.params);
    const reservation = await getReservationById(reservationId);

    const isRenter = reservation?.renterId === req.user.id;
    if (!isRenter && !isStaff(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { code, qrToken } = verifyReturnSchema.parse(req.body || {});
    const result = await verifyReturn({
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

