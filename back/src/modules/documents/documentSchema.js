import { z } from 'zod';

export const documentTypes = [
  'identity_card',
  'passport',
  'driver_license',
  'carte_grise',
  'insurance',
  'technical_control',
  'business_registration',
  'nif',
  'professional_insurance',
];

const documentTypeAliases = {
  professional_insurnce: 'professional_insurance',
};

const normalizeDocumentType = (value) => {
  const trimmed = String(value || '').trim().toLowerCase();
  return documentTypeAliases[trimmed] || trimmed;
};

const documentTypeSchema = z.preprocess(
  normalizeDocumentType,
  z.enum(documentTypes),
);

export const documentStatuses = [
  'pending',
  'manual_review',
  'approved',
  'rejected',
];

const hasExactlyOneOwner = (value) => {
  const owners = [value.userId, value.carId, value.companyId].filter(
    (owner) => owner !== undefined && owner !== null,
  );
  return owners.length === 1;
};

export const uploadDocumentBodySchema = z
  .object({
    userId: z.string().uuid().optional(),
    carId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    documentType: documentTypeSchema,
  })
  .refine(hasExactlyOneOwner, {
    message: 'Exactly one owner is required: userId, carId or companyId',
});


export const createDocumentSchema = z.object({
  userId: z.string().uuid().optional(),
  carId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  documentType: documentTypeSchema,
  documentUrl: z.string().url(),
}).refine(hasExactlyOneOwner, {
  message: 'Exactly one owner is required: userId, carId or companyId',
});

export const updateDocumentSchema = z.object({
  status: z.enum(documentStatuses).optional(),
  reviewedBy: z.string().uuid().optional(),
  reviewedAt: z.string().datetime().optional(),
  documentUrl: z.string().url().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required for update',
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const documentFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  carId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  documentType: documentTypeSchema.optional(),
  status: z.enum(documentStatuses).optional(),
});
