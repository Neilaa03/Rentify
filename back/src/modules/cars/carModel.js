import { supabase } from '../../config/supabase.js';

const CARS_TABLE = 'cars';

const toCarDto = (row) => ({
  id: row.id,
  ownerId: row.owner_id,
  brand: row.brand,
  model: row.model,
  year: row.year,
  color: row.color,
  fuelType: row.fuel_type,
  transmission: row.transmission,
  mileage: row.mileage,
  seats: row.seats,
  registrationNumber: row.registration_number,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toCarTablePayload = (payload) => {
  const mapped = {};

  if (payload.ownerId !== undefined) mapped.owner_id = payload.ownerId;
  if (payload.brand !== undefined) mapped.brand = payload.brand;
  if (payload.model !== undefined) mapped.model = payload.model;
  if (payload.year !== undefined) mapped.year = payload.year;
  if (payload.color !== undefined) mapped.color = payload.color;
  if (payload.fuelType !== undefined) mapped.fuel_type = payload.fuelType;
  if (payload.transmission !== undefined) mapped.transmission = payload.transmission;
  if (payload.mileage !== undefined) mapped.mileage = payload.mileage;
  if (payload.seats !== undefined) mapped.seats = payload.seats;
  if (payload.registrationNumber !== undefined) {
    mapped.registration_number = payload.registrationNumber;
  }
  if (payload.description !== undefined) mapped.description = payload.description;

  return mapped;
};

export const getCars = async (filters = {}) => {
  const { search } = filters;
  let query = supabase.from(CARS_TABLE).select('*');

  if (search) {
    query = query.or(`brand.ilike.%${search}%,model.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(toCarDto);
};

export const getCarById = async (id) => {
  const { data, error } = await supabase
    .from(CARS_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Car not found');
  return toCarDto(data);
};

export const createCar = async (payload) => {
  const insertPayload = toCarTablePayload(payload);
  const { data, error } = await supabase
    .from(CARS_TABLE)
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return toCarDto(data);
};

export const updateCar = async (id, updates) => {
  const updatePayload = toCarTablePayload(updates);
  const { data, error } = await supabase
    .from(CARS_TABLE)
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error('Update failed');
  return toCarDto(data);
};

export const deleteCar = async (id) => {
  const { error } = await supabase.from(CARS_TABLE).delete().eq('id', id);
  if (error) throw error;
  return { message: 'Car deleted' };
};
