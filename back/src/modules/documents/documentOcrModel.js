import { supabase } from '../../config/supabase.js';

const DOCUMENT_OCR_TABLE = 'document_ocr_results';

const toDocumentOcrDto = (row) => ({
  id: row.id,
  documentId: row.document_id,
  ocrText: row.ocr_text,
  extractedFullName: row.extracted_full_name,
  extractedDocumentNumber: row.extracted_document_number,
  extractedExpirationDate: row.extracted_expiration_date,
  confidenceScore: row.confidence_score,
  verificationStatus: row.verification_status,
  verificationReason: row.verification_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toDocumentOcrTablePayload = (payload) => {
  const mapped = {};

  if (payload.documentId !== undefined) mapped.document_id = payload.documentId;
  if (payload.ocrText !== undefined) mapped.ocr_text = payload.ocrText;
  if (payload.extractedFullName !== undefined) mapped.extracted_full_name = payload.extractedFullName;
  if (payload.extractedDocumentNumber !== undefined) mapped.extracted_document_number = payload.extractedDocumentNumber;
  if (payload.extractedExpirationDate !== undefined) mapped.extracted_expiration_date = payload.extractedExpirationDate;
  if (payload.confidenceScore !== undefined) mapped.confidence_score = payload.confidenceScore;
  if (payload.verificationStatus !== undefined) mapped.verification_status = payload.verificationStatus;
  if (payload.verificationReason !== undefined) mapped.verification_reason = payload.verificationReason;

  return mapped;
};

export const getDocumentOcrResultByDocumentId = async (documentId) => {
  const { data, error } = await supabase
    .from(DOCUMENT_OCR_TABLE)
    .select('*')
    .eq('document_id', documentId)
    .single();

  if (error || !data) return null;
  return toDocumentOcrDto(data);
};

export const upsertDocumentOcrResult = async (payload) => {
  const insertPayload = toDocumentOcrTablePayload(payload);
  const { data, error } = await supabase
    .from(DOCUMENT_OCR_TABLE)
    .upsert([insertPayload], { onConflict: 'document_id' })
    .select()
    .single();

  if (error) throw error;
  return toDocumentOcrDto(data);
};
<<<<<<< HEAD
=======

export const deleteDocumentOcrResultByDocumentId = async (documentId) => {
  const { error } = await supabase
    .from(DOCUMENT_OCR_TABLE)
    .delete()
    .eq('document_id', documentId);

  if (error) throw error;
  return { message: 'OCR result deleted' };
};

export const deleteDocumentOcrResultsByDocumentIds = async (documentIds = []) => {
  const ids = [...new Set(documentIds)].filter(Boolean);
  if (!ids.length) return { message: 'No OCR results to delete' };

  const { error } = await supabase
    .from(DOCUMENT_OCR_TABLE)
    .delete()
    .in('document_id', ids);

  if (error) throw error;
  return { message: 'OCR results deleted' };
};
>>>>>>> dev
