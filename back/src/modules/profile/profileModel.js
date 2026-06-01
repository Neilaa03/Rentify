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

