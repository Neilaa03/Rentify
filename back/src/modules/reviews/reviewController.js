import * as model from './reviewModel.js';
import { carIdParamSchema, createReviewSchema, paginationSchema, reservationIdParamSchema } from './reviewSchemas.js';

const isReservationEnded = (reservationRow) => {
  const ymd = reservationRow?.end_date;
  if (!ymd) return false;
  const endMs = Date.parse(`${ymd}T00:00:00.000Z`);
  if (!Number.isFinite(endMs)) return false;
  const todayMs = Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
  return endMs < todayMs;
};

export const getReservationReviewHandler = async (req, res) => {
  try {
    const { reservationId } = reservationIdParamSchema.parse(req.params);
    const reservation = await model.getReservationForReview(reservationId);

    const isRenter = reservation.renter_id === req.user.id;
    const ownerId = reservation?.listings?.cars?.owner_id;
    const isOwner = ownerId && ownerId === req.user.id;
    const isStaff = ['admin', 'companyManager'].includes(req.user.role);

    if (!isRenter && !isOwner && !isStaff) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const review = await model.getReviewByReservationId(reservationId);
    res.json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const createReservationReviewHandler = async (req, res) => {
  try {
    const { reservationId } = reservationIdParamSchema.parse(req.params);
    const payload = createReviewSchema.parse(req.body);

    const reservation = await model.getReservationForReview(reservationId);
    if (reservation.renter_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only review your own reservations.' });
    }

    const endedByDate = isReservationEnded(reservation);
    const endedByStatus = ['finished', 'refunded', 'refund_pending', 'return_pending'].includes(reservation.status);
    if (!endedByDate && !endedByStatus) {
      return res.status(400).json({ error: 'You can only review after the reservation ends.' });
    }

    const existing = await model.getReviewByReservationId(reservationId);
    if (existing) {
      return res.status(409).json({ error: 'Review already submitted for this reservation.' });
    }

    const review = await model.createReview({
      reservationId,
      reviewerId: req.user.id,
      rating: payload.rating,
      comment: payload.comment,
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const listCarReviewsHandler = async (req, res) => {
  try {
    const { carId } = carIdParamSchema.parse(req.params);
    const { page, limit } = paginationSchema.parse(req.query);
    const items = await model.getReviewsByCarId({ carId, page, limit });
    res.json({ items, page, limit });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const carReviewSummaryHandler = async (req, res) => {
  try {
    const { carId } = carIdParamSchema.parse(req.params);
    const summary = await model.getCarReviewSummary({ carId });
    res.json(summary);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

