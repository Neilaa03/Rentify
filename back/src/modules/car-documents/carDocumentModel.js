import { supabase } from '../../config/supabase.js';

const DOCUMENTS_TABLE = 'documents';

const toCarDocumentDto = (row) => ({
  id: row.id,
  carId: row.car_id,
  documentType: row.document_type,
  documentUrl: row.document_url,
  status: row.status,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  createdAt: row.created_at,
});

const toDocumentsTablePayload = (payload) => {
  const mapped = {};

  if (payload.carId !== undefined) mapped.car_id = payload.carId;
  if (payload.documentType !== undefined) mapped.document_type = payload.documentType;
  if (payload.documentUrl !== undefined) mapped.document_url = payload.documentUrl;
  if (payload.status !== undefined) mapped.status = payload.status;
  if (payload.reviewedBy !== undefined) mapped.reviewed_by = payload.reviewedBy;
  if (payload.reviewedAt !== undefined) mapped.reviewed_at = payload.reviewedAt;

  return mapped;
};

export const getCarDocuments = async (filters = {}) => {
  const { carId, documentType, status } = filters;
  let query = supabase.from(DOCUMENTS_TABLE).select('*').not('car_id', 'is', null);

  if (carId) query = query.eq('car_id', carId);
  if (documentType) query = query.eq('document_type', documentType);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(toCarDocumentDto);
};

export const getCarDocumentById = async (id) => {
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select('*')
    .eq('id', id)
    .not('car_id', 'is', null)
    .single();

  if (error || !data) throw new Error('Car document not found');
  return toCarDocumentDto(data);
};

export const createCarDocument = async (payload) => {
  const insertPayload = toDocumentsTablePayload(payload);
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return toCarDocumentDto(data);
};

export const updateCarDocument = async (id, updates) => {
  const updatePayload = toDocumentsTablePayload(updates);
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .update(updatePayload)
    .eq('id', id)
    .not('car_id', 'is', null)
    .select()
    .single();

  if (error || !data) throw new Error('Update failed');
  return toCarDocumentDto(data);
};

export const deleteCarDocument = async (id) => {
  const { error } = await supabase
    .from(DOCUMENTS_TABLE)
    .delete()
    .eq('id', id)
    .not('car_id', 'is', null);
  if (error) throw error;
  return { message: 'Car document deleted' };
};
