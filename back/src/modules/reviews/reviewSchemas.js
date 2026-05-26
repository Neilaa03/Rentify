import { z } from 'zod';

export const reservationIdParamSchema = z.object({
  reservationId: z.string().uuid('reservationId must be a valid UUID'),
});

export const carIdParamSchema = z.object({
  carId: z.string().uuid('carId must be a valid UUID'),
});

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sortBy: z.enum(['createdAt', 'rating']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
