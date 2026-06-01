import { supabase } from '../../config/supabase.js';

const DOCUMENTS_TABLE = 'documents';

const toDocumentDto = (row) => ({
  id: row.id,
  userId: row.user_id,
  carId: row.car_id,
  companyId: row.company_id,
  documentType: row.document_type,
  documentUrl: row.document_url,
  status: row.status,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  createdAt: row.created_at,
});

const toDocumentTablePayload = (payload) => {
  const mapped = {};

  if (payload.userId !== undefined) mapped.user_id = payload.userId;
  if (payload.carId !== undefined) mapped.car_id = payload.carId;
  if (payload.companyId !== undefined) mapped.company_id = payload.companyId;
  if (payload.documentType !== undefined) mapped.document_type = payload.documentType;
  if (payload.documentUrl !== undefined) mapped.document_url = payload.documentUrl;
  if (payload.status !== undefined) mapped.status = payload.status;
  if (payload.reviewedBy !== undefined) mapped.reviewed_by = payload.reviewedBy;
  if (payload.reviewedAt !== undefined) mapped.reviewed_at = payload.reviewedAt;

  return mapped;
};

export const getDocuments = async (filters = {}) => {
  const { userId, carId, companyId, documentType, status } = filters;
  let query = supabase.from(DOCUMENTS_TABLE).select('*');

  if (userId) query = query.eq('user_id', userId);
  if (carId) query = query.eq('car_id', carId);
  if (companyId) query = query.eq('company_id', companyId);
  if (documentType) query = query.eq('document_type', documentType);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(toDocumentDto);
};

export const hasApprovedDocument = async (filters = {}) => {
  const documents = await getDocuments(filters);
  return documents.some((document) => String(document.status || '').toLowerCase() === 'approved');
};

export const getDocumentById = async (id) => {
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Document not found');
  return toDocumentDto(data);
};

export const createDocument = async (payload) => {
  const insertPayload = toDocumentTablePayload(payload);
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return toDocumentDto(data);
};

export const updateDocument = async (id, updates) => {
  const updatePayload = toDocumentTablePayload(updates);
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Update failed');
  return toDocumentDto(data);
};

export const deleteDocument = async (id) => {
  const { error } = await supabase.from(DOCUMENTS_TABLE).delete().eq('id', id);
  if (error) throw error;
  return { message: 'Document deleted' };
};
