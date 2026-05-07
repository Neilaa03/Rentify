import { z } from 'zod';

const carDocumentTypes = ['carte_grise', 'insurance', 'technical_control'];
const documentStatuses = ['pending', 'approved', 'rejected'];

const carDocumentBaseSchema = z.object({
  carId: z.uuid('carId must be a valid UUID'),
  documentType: z.enum(carDocumentTypes, {
    error: 'documentType must be one of: carte_grise, insurance, technical_control',
  }),
  documentUrl: z.url('documentUrl must be a valid URL'),
  status: z
    .enum(documentStatuses, {
      error: 'status must be one of: pending, approved, rejected',
    })
    .optional(),
  reviewedBy: z.uuid('reviewedBy must be a valid UUID').optional(),
  reviewedAt: z.iso.datetime('reviewedAt must be a valid ISO datetime').optional(),
});

export const createCarDocumentSchema = carDocumentBaseSchema;

export const updateCarDocumentSchema = carDocumentBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for update',
  });

export const idParamSchema = z.object({
  id: z.uuid('id must be a valid UUID'),
});

export const carIdParamSchema = z.object({
  carId: z.uuid('carId must be a valid UUID'),
});

export const carDocumentFiltersSchema = z.object({
  carId: z.uuid('carId must be a valid UUID').optional(),
  documentType: z.enum(carDocumentTypes).optional(),
  status: z.enum(documentStatuses).optional(),
});

export const uploadCarDocumentBodySchema = z.object({
  documentType: z.enum(carDocumentTypes, {
    error: 'documentType must be one of: carte_grise, insurance, technical_control',
  }),
  status: z
    .enum(documentStatuses, {
      error: 'status must be one of: pending, approved, rejected',
    })
    .optional(),
});
