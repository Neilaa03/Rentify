import { supabase } from '../../config/supabase.js';

const FEEDBACK_TABLE = 'feedback';
const RESERVATIONS_TABLE = 'reservations';

const toReviewerDto = (user) => user ? {
  id: user.id,
  firstName: user.first_name,
  lastName: user.last_name,
  profilePicture: user.profile_picture || null,
} : null;

const toReviewDto = (row) => ({
  id: row.id,
  reservationId: row.reservation_id,
  reviewerId: row.reviewer_id,
  rating: row.rating,
  comment: row.comment,
  createdAt: row.created_at,
  reviewer: toReviewerDto(row.users),
});

export const getReservationForReview = async (reservationId) => {
  const { data, error } = await supabase
    .from(RESERVATIONS_TABLE)
    .select('id, renter_id, listing_id, status, listings(id, car_id)')
    .eq('id', reservationId)
    .single();

  if (error || !data) throw new Error('Reservation not found');
  return data;
};

export const getReviewCountForReservationByReviewer = async ({ reservationId, reviewerId }) => {
  const { count, error } = await supabase
    .from(FEEDBACK_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('reservation_id', reservationId)
    .eq('reviewer_id', reviewerId);

  if (error) throw error;
  return Number(count || 0);
};

export const createReview = async ({ reservationId, reviewerId, rating, comment }) => {
  const reservation = await getReservationForReview(reservationId);
  if (reservation.renter_id !== reviewerId) throw new Error('You can only review your own reservations');
  if (reservation.status !== 'finished') throw new Error('You can only review finished reservations');

  const existingCount = await getReviewCountForReservationByReviewer({ reservationId, reviewerId });
  if (existingCount >= 5) throw new Error('You have reached the maximum of 5 reviews for this reservation');

  const { data, error } = await supabase
    .from(FEEDBACK_TABLE)
    .insert({
      reservation_id: reservationId,
      reviewer_id: reviewerId,
      rating,
      comment: comment || null,
    })
    .select('id, reservation_id, reviewer_id, rating, comment, created_at, users(id, first_name, last_name, profile_picture)')
    .single();

  if (error || !data) throw error || new Error('Failed to create review');
  return toReviewDto(data);
};

export const getReservationReview = async ({ reservationId, reviewerId }) => {
  let query = supabase
    .from(FEEDBACK_TABLE)
    .select('id, reservation_id, reviewer_id, rating, comment, created_at, users(id, first_name, last_name, profile_picture)')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false });

  if (reviewerId) query = query.eq('reviewer_id', reviewerId);

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return data?.[0] ? toReviewDto(data[0]) : null;
};

export const getReviewsByCarId = async ({ carId, page = 1, limit = 10 } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  const { data, error } = await supabase
    .from(FEEDBACK_TABLE)
    .select('id, reservation_id, reviewer_id, rating, comment, created_at, users(id, first_name, last_name, profile_picture), reservations!inner(id, listings!inner(id, car_id))')
    .eq('reservations.listings.car_id', carId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return (data || []).map(toReviewDto);
};

export const getCarReviewSummary = async ({ carId }) => {
  const { data, error } = await supabase
    .from(FEEDBACK_TABLE)
    .select('rating, reservations!inner(id, listings!inner(id, car_id))')
    .eq('reservations.listings.car_id', carId);

  if (error) throw error;

  const ratings = (data || []).map((row) => Number(row.rating || 0)).filter((rating) => rating > 0);
  const total = ratings.reduce((sum, rating) => sum + rating, 0);

  return {
    carId,
    reviewCount: ratings.length,
    averageRating: ratings.length ? total / ratings.length : 0,
  };
};
