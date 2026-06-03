import { z } from 'zod';

export const assistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(6000),
  createdAt: z.string().datetime().optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(6000),
  conversationId: z.string().uuid().optional(),
  context: z.array(assistantMessageSchema).max(20).optional().default([]),
});

export const searchVehicleFiltersSchema = z.object({
  country: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  availableFrom: z.string().trim().max(32).optional(),
  availableTo: z.string().trim().max(32).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  fuelType: z.string().trim().max(50).optional(),
  transmission: z.string().trim().max(50).optional(),
  seats: z.coerce.number().int().positive().max(20).optional(),
  brand: z.string().trim().max(80).optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
  page: z.coerce.number().int().positive().max(20).optional().default(1),
  limit: z.coerce.number().int().positive().max(8).optional().default(5),
});

export const vehicleDetailsSchema = z.object({
  vehicleId: z.string().trim().min(1).max(120),
});
