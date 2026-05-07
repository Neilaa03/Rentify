import { supabase } from '../../config/supabase.js';

const CAR_IMAGES_TABLE = 'car_images';

const toCarImageDto = (row) => ({
  id: row.id,
  carId: row.car_id,
  imageUrl: row.image_url,
  isPrimary: row.is_primary,
  uploadedAt: row.uploaded_at,
});

const toCarImageTablePayload = (payload) => {
  const mapped = {};

  if (payload.carId !== undefined) mapped.car_id = payload.carId;
  if (payload.imageUrl !== undefined) mapped.image_url = payload.imageUrl;
  if (payload.isPrimary !== undefined) mapped.is_primary = payload.isPrimary;

  return mapped;
};

export const getCarImages = async (filters = {}) => {
  const { carId, isPrimary } = filters;
  let query = supabase.from(CAR_IMAGES_TABLE).select('*');

  if (carId) {
    query = query.eq('car_id', carId);
  }

  if (isPrimary !== undefined) {
    query = query.eq('is_primary', isPrimary);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(toCarImageDto);
};

export const getCarImageById = async (id) => {
  const { data, error } = await supabase
    .from(CAR_IMAGES_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Car image not found');
  return toCarImageDto(data);
};

export const createCarImage = async (payload) => {
  const insertPayload = toCarImageTablePayload(payload);
  const { data, error } = await supabase
    .from(CAR_IMAGES_TABLE)
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return toCarImageDto(data);
};

export const updateCarImage = async (id, updates) => {
  const updatePayload = toCarImageTablePayload(updates);
  const { data, error } = await supabase
    .from(CAR_IMAGES_TABLE)
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error('Update failed');
  return toCarImageDto(data);
};

export const deleteCarImage = async (id) => {
  const { error } = await supabase.from(CAR_IMAGES_TABLE).delete().eq('id', id);
  if (error) throw error;
  return { message: 'Car image deleted' };
};
