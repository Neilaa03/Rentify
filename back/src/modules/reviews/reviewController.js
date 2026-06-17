import {
  createReview,
  getCarReviewSummary,
  getReservationReview,
  getReviewsByCarId,
} from './reviewModel.js';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const listCarReviewsHandler = async (req, res) => {
  try {
    const { carId } = req.params;
    const page = parsePositiveInt(req.query?.page, 1);
    const limit = parsePositiveInt(req.query?.limit, 10);
    const items = await getReviewsByCarId({ carId, page, limit });
    res.json({ items, page, limit });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const carReviewSummaryHandler = async (req, res) => {
  try {
    const { carId } = req.params;
    const summary = await getCarReviewSummary({ carId });
    res.json(summary);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getReservationReviewHandler = async (req, res) => {
  try {
    const review = await getReservationReview({
      reservationId: req.params.reservationId,
      reviewerId: req.user?.id,
    });
    res.json({ review });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const createReservationReviewHandler = async (req, res) => {
  try {
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    const review = await createReview({
      reservationId: req.params.reservationId,
      reviewerId: req.user.id,
      rating,
      comment: req.body?.comment,
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
