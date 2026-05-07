import { z } from 'zod';

const currentYear = new Date().getFullYear();

const carBaseSchema = z.object({
  ownerId: z.uuid('ownerId must be a valid UUID'),
  brand: z.string().trim().min(1, 'brand is required'),
  model: z.string().trim().min(1, 'model is required'),
  year: z.coerce
    .number()
    .int('year must be an integer')
    .min(1886, 'year is too old')
    .max(currentYear + 1, 'year is too far in the future')
    .optional(),
  color: z.string().trim().min(1).max(50).optional(),
  fuelType: z.string().trim().min(1).max(50).optional(),
  transmission: z.string().trim().min(1).max(50).optional(),
  mileage: z.coerce.number().int().min(0).optional(),
  seats: z.coerce.number().int().min(1).optional(),
  registrationNumber: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().optional(),
});

export const createCarSchema = carBaseSchema;

export const updateCarSchema = carBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for update',
  });

export const idParamSchema = z.object({
  id: z.uuid('id must be a valid UUID'),
});

export const carFiltersSchema = z.object({
  search: z.string().trim().optional(),
});
