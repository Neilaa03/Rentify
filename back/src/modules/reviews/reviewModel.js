import { supabase } from '../../config/supabase.js';

const FEEDBACK_TABLE = 'feedback';
const RESERVATIONS_TABLE = 'reservations';

const toReviewDto = (row) => ({
  id: row.id,
  reservationId: row.reservation_id,
  reviewerId: row.reviewer_id,
  rating: row.rating,
  comment: row.comment,
  createdAt: row.created_at,
  reviewer: row.users
    ? {
        id: row.users.id,
        firstName: row.users.first_name,
        lastName: row.users.last_name,
        profilePicture: row.users.profile_picture,
      }
    : null,
});

export const getReservationForReview = async (reservationId) => {
  const { data, error } = await supabase
    .from(RESERVATIONS_TABLE)
    .select('id, renter_id, end_date, status, listing_id, listings(id, car_id, cars(id, owner_id))')
    .eq('id', reservationId)
    .single();

  if (error || !data) throw new Error('Reservation not found');
  return data;
};

export const getReviewByReservationId = async (reservationId) => {
  const { data, error } = await supabase
    .from(FEEDBACK_TABLE)
    .select(
      'id, reservation_id, reviewer_id, rating, comment, created_at, users(id, first_name, last_name, profile_picture)'
    )
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toReviewDto);
};

export const getReviewCountForReservationByReviewer = async ({ reservationId, reviewerId }) => {
  const { count, error } = await supabase
    .from(FEEDBACK_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('reservation_id', reservationId)
    .eq('reviewer_id', reviewerId);

  if (error) throw error;
  return Number(count || 0) || 0;
};

export const createReview = async ({ reservationId, reviewerId, rating, comment }) => {
  const { data, error } = await supabase
    .from(FEEDBACK_TABLE)
    .insert([
      {
        reservation_id: reservationId,
        reviewer_id: reviewerId,
        rating,
        comment: comment || null,
      },
    ])
    .select('id, reservation_id, reviewer_id, rating, comment, created_at, users(id, first_name, last_name, profile_picture)')
    .single();

  if (error || !data) throw error || new Error('Failed to create review');
  return toReviewDto(data);
};

export const getReviewsByCarId = async ({ carId, page, limit }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from(FEEDBACK_TABLE)
    .select(
      'id, reservation_id, reviewer_id, rating, comment, created_at, reservations!inner(id, listing_id, listings!inner(id, car_id)), users(id, first_name, last_name, profile_picture)'
    )
    .eq('reservations.listings.car_id', carId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return (data || []).map(toReviewDto);
};

export const getCarReviewSummary = async ({ carId }) => {
  const { data, error, count } = await supabase
    .from(FEEDBACK_TABLE)
    .select('rating, reservations!inner(listings!inner(car_id))', { count: 'exact' })
    .eq('reservations.listings.car_id', carId);

  if (error) throw error;
  const rows = data || [];
  const total = rows.reduce((sum, row) => sum + (Number(row.rating) || 0), 0);
  const reviewCount = typeof count === 'number' ? count : rows.length;
  const averageRating = reviewCount ? total / reviewCount : 0;

  return { carId, reviewCount, averageRating };
};
