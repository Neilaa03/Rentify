import { supabase } from '../../config/supabase.js';

const LISTINGS_TABLE = 'listings';

const toCarDto = (carRow) => {
  if (!carRow) return null;

  return {
    id: carRow.id,
    ownerId: carRow.owner_id,
    brand: carRow.brand,
    model: carRow.model,
    year: carRow.year,
    color: carRow.color,
    fuelType: carRow.fuel_type,
    transmission: carRow.transmission,
    mileage: carRow.mileage,
    seats: carRow.seats,
    registrationNumber: carRow.registration_number,
    description: carRow.description,
    images: (carRow.car_images || []).map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      isPrimary: image.is_primary,
      uploadedAt: image.uploaded_at,
    })),
    createdAt: carRow.created_at,
    updatedAt: carRow.updated_at,
  };
};

export const toListingDto = (row) => ({
  id: row.id,
  carId: row.car_id,
  title: row.title,
  description: row.description,
  country: row.country,
  city: row.city,
  pricePerDay: row.price_per_day,
  pricePerWeek: row.price_per_week,
  pricePerMonth: row.price_per_month,
  availableFrom: row.available_from,
  availableTo: row.available_to,
  isActive: row.is_active,
  createdAt: row.created_at,
  car: toCarDto(row.cars),
});

const toListingTablePayload = (payload) => {
  const mapped = {};

  if (payload.carId !== undefined) mapped.car_id = payload.carId;
  if (payload.title !== undefined) mapped.title = payload.title;
  if (payload.description !== undefined) mapped.description = payload.description;
  if (payload.country !== undefined) mapped.country = payload.country;
  if (payload.city !== undefined) mapped.city = payload.city;
  if (payload.pricePerDay !== undefined) mapped.price_per_day = payload.pricePerDay;
  if (payload.pricePerWeek !== undefined) mapped.price_per_week = payload.pricePerWeek;
  if (payload.pricePerMonth !== undefined) {
    mapped.price_per_month = payload.pricePerMonth;
  }
  if (payload.availableFrom !== undefined) mapped.available_from = payload.availableFrom;
  if (payload.availableTo !== undefined) mapped.available_to = payload.availableTo;
  if (payload.isActive !== undefined) mapped.is_active = payload.isActive;

  return mapped;
};

export const listingBaseSelect =
  'id, car_id, title, description, country, city, price_per_day, price_per_week, price_per_month, available_from, available_to, is_active, created_at, cars!inner(*, car_images(*))';

export const getListings = async (filters = {}) => {
  const {
    country,
    city,
    availableFrom,
    availableTo,
    minPrice,
    maxPrice,
    fuelType,
    transmission,
    seats,
    brand,
    year,
    page = 1,
    limit = 10,
    sortOrder = 'asc',
  } = filters;

  let query = supabase
    .from(LISTINGS_TABLE)
    .select(listingBaseSelect, { count: 'exact' })
    .order('price_per_day', { ascending: sortOrder === 'asc' });

  if (country) query = query.ilike('country', `%${country}%`);
  if (city) query = query.ilike('city', `%${city}%`);
  if (availableFrom) query = query.gte('available_from', availableFrom);
  if (availableTo) query = query.lte('available_to', availableTo);
  if (minPrice !== undefined) query = query.gte('price_per_day', minPrice);
  if (maxPrice !== undefined) query = query.lte('price_per_day', maxPrice);
  if (fuelType) query = query.ilike('cars.fuel_type', `%${fuelType}%`);
  if (transmission) {
    query = query.ilike('cars.transmission', `%${transmission}%`);
  }
  if (seats !== undefined) query = query.eq('cars.seats', seats);
  if (brand) query = query.ilike('cars.brand', `%${brand}%`);
  if (year !== undefined) query = query.eq('cars.year', year);

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: (data || []).map(toListingDto),
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: count ? Math.ceil(count / limit) : 0,
    },
  };
};

export const getListingById = async (id) => {
  const { data, error } = await supabase
    .from(LISTINGS_TABLE)
    .select(listingBaseSelect)
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Listing not found');
  return toListingDto(data);
};

export const createListing = async (payload) => {
  const insertPayload = toListingTablePayload(payload);
  const { data, error } = await supabase
    .from(LISTINGS_TABLE)
    .insert([insertPayload])
    .select(listingBaseSelect)
    .single();

  if (error) throw error;
  return toListingDto(data);
};

export const updateListing = async (id, updates) => {
  const updatePayload = toListingTablePayload(updates);
  const { data, error } = await supabase
    .from(LISTINGS_TABLE)
    .update(updatePayload)
    .eq('id', id)
    .select(listingBaseSelect)
    .single();

  if (error || !data) throw new Error('Update failed');
  return toListingDto(data);
};

export const deleteListing = async (id) => {
  const { error } = await supabase.from(LISTINGS_TABLE).delete().eq('id', id);
  if (error) throw error;
  return { message: 'Listing deleted' };
};
