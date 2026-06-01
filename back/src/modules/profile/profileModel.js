import { supabase } from '../../config/supabase.js';

const countOrZero = (res) => {
  if (!res) return 0;
  if (res.error) throw res.error;
  return Number(res.count || 0) || 0;
};

export const getOwnerProfileStats = async ({ ownerId }) => {
  if (!ownerId) throw new Error('ownerId required');

  const [carsRes, listingsRes, reservationsRes] = await Promise.all([
    supabase.from('cars').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId),
    supabase
      .from('listings')
      .select('id, cars!inner(owner_id)', { count: 'exact', head: true })
      .eq('cars.owner_id', ownerId),
    supabase
      .from('reservations')
      .select('id, listings!inner(cars!inner(owner_id))', { count: 'exact', head: true })
      .eq('listings.cars.owner_id', ownerId),
  ]);

  return {
    cars: countOrZero(carsRes),
    listings: countOrZero(listingsRes),
    reservations: countOrZero(reservationsRes),
  };
};

export const getClientProfileStats = async ({ userId }) => {
  if (!userId) throw new Error('userId required');

  const [favoritesRes, reservationsRes, reviewsRes] = await Promise.all([
    supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('renter_id', userId),
    supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('reviewer_id', userId),
  ]);

  return {
    favorites: countOrZero(favoritesRes),
    reservations: countOrZero(reservationsRes),
    reviews: countOrZero(reviewsRes),
  };
};
