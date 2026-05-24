import { z } from 'zod';

const listingBaseSchema = z.object({
  carId: z.uuid('carId must be a valid UUID'),
  title: z.string().trim().min(1, 'title is required'),
  description: z.string().trim().optional(),
  country: z.string().trim().min(1, 'country is required'),
  city: z.string().trim().min(1, 'city is required'),
  pricePerDay: z.coerce.number().min(0, 'pricePerDay must be >= 0'),
  pricePerWeek: z.coerce.number().min(0).optional(),
  pricePerMonth: z.coerce.number().min(0).optional(),
  pickupAddress: z.string().trim().min(1, 'pickupAddress is required'),
  deliveryFee: z.coerce.number().min(0, 'deliveryFee must be >= 0').optional(),
  availableFrom: z.string().date('availableFrom must be a valid date (YYYY-MM-DD)'),
  availableTo: z.string().date('availableTo must be a valid date (YYYY-MM-DD)'),
  isActive: z.coerce.boolean().optional(),
});

export const createListingSchema = listingBaseSchema;

export const updateListingSchema = listingBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for update',
  });

export const idParamSchema = z.object({
  id: z.uuid('id must be a valid UUID'),
});

export const listingFiltersSchema = z
  .object({
    country: z.string().trim().optional(),
    city: z.string().trim().optional(),
    availableFrom: z.string().date().optional(),
    availableTo: z.string().date().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    fuelType: z.string().trim().optional(),
    transmission: z.string().trim().optional(),
    seats: z.coerce.number().int().min(1).optional(),
    brand: z.string().trim().optional(),
    year: z.coerce.number().int().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.enum(['price']).default('price'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: 'minPrice must be less than or equal to maxPrice',
      path: ['minPrice'],
    }
  );
