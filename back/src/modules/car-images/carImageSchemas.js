import { z } from 'zod';

const imageUrlSchema = z.url('imageUrl must be a valid URL');

const carImageBaseSchema = z.object({
  carId: z.uuid('carId must be a valid UUID'),
  imageUrl: imageUrlSchema,
  isPrimary: z.coerce.boolean().optional(),
});

export const createCarImageSchema = carImageBaseSchema;

export const updateCarImageSchema = carImageBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for update',
  });

export const idParamSchema = z.object({
  id: z.uuid('id must be a valid UUID'),
});

export const carImageFiltersSchema = z.object({
  carId: z.uuid('carId must be a valid UUID').optional(),
  isPrimary: z.coerce.boolean().optional(),
});
