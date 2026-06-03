import crypto from 'crypto';
import { supabase } from '../../config/supabase.js';
import { getClientProfileStats, getOwnerProfileStats } from '../profile/profileModel.js';
import { getListings, getListingById } from '../car-listings/listingModel.js';
import { getUserById } from '../auth/authModel.js';

const RESERVATION_SELECT =
  'id, listing_id, renter_id, start_date, end_date, total_price, status, created_at, pickup(status, pickup_method, pickup_address, delivery_fee), listings(id, car_id, title, city, country, price_per_day, price_per_week, price_per_month, pickup_address, delivery_fee, cars(id, owner_id, brand, model, year, seats, transmission, fuel_type, car_images(id, image_url, is_primary)))';

const toReservationSummary = (row) => {
  const pickup = Array.isArray(row.pickup) ? row.pickup[0] : row.pickup;
  const listing = row.listings || null;
  const car = listing?.cars || null;

  return {
    id: row.id,
    listingId: row.listing_id,
    startDate: row.start_date,
    endDate: row.end_date,
    totalPrice: row.total_price,
    status: row.status,
    createdAt: row.created_at,
    pickup: pickup ? {
      status: pickup.status,
      method: pickup.pickup_method,
      address: pickup.pickup_address,
      deliveryFee: pickup.delivery_fee,
    } : null,
    listing: listing ? {
      id: listing.id,
      title: listing.title,
      city: listing.city,
      country: listing.country,
      pricePerDay: listing.price_per_day,
      car: car ? {
        id: car.id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        seats: car.seats,
        transmission: car.transmission,
        fuelType: car.fuel_type,
        primaryImage: (car.car_images || []).find((image) => image.is_primary)?.image_url || car.car_images?.[0]?.image_url || null,
      } : null,
    } : null,
  };
};

export const createConversationId = () => crypto.randomUUID();

export const getReservationsForUser = async (userId) => {
  const { data, error } = await supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('renter_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data || []).map(toReservationSummary);
};

export const searchVehiclesReadOnly = async (filters) => {
  const result = await getListings({
    ...filters,
    isActive: true,
    page: filters.page || 1,
    limit: Math.min(filters.limit || 5, 8),
  });

  return {
    items: result.items || [],
    pagination: result.pagination,
  };
};

export const getVehicleDetailsReadOnly = async (vehicleId) => {
  return getListingById(vehicleId);
};

export const getUserProfileReadOnly = async (userId, role) => {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const [clientStats, ownerStats] = await Promise.all([
    getClientProfileStats({ userId }).catch(() => null),
    ['owner', 'agency', 'admin', 'companyManager'].includes(role)
      ? getOwnerProfileStats({ ownerId: userId }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.is_active,
    isVerified: user.is_verified,
    emailVerifiedAt: user.email_verified_at,
    profilePicture: user.profile_picture,
    stats: {
      client: clientStats,
      owner: ownerStats,
    },
  };
};

export const logAssistantMessage = async ({ conversationId, userId, role, content, metadata = {} }) => {
  if (String(process.env.ASSISTANT_ENABLE_DB_LOGGING || '').toLowerCase() !== 'true') {
    console.info('[assistant]', { conversationId, userId, role, metadata });
    return;
  }

  const { error: conversationError } = await supabase
    .from('assistant_conversations')
    .upsert({ id: conversationId, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (conversationError) throw conversationError;

  const { error } = await supabase.from('assistant_messages').insert([{
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
    metadata,
  }]);

  if (error) throw error;
};
