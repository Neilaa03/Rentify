import { z } from 'zod';

export const assistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(6000),
  createdAt: z.string().datetime().optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(6000),
  conversationId: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.string().uuid().optional()
  ),
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

const optionalUuid = () => z.preprocess(
  (value) => (value === null || value === '' ? undefined : value),
  z.string().uuid().optional()
);

const optionalReferenceNumber = () => z.preprocess(
  (value) => (value === null || value === '' ? undefined : value),
  z.coerce.number().int().positive().max(50).optional()
);

export const listingDetailsSchema = z.object({
  listingId: optionalUuid(),
  listingNumber: optionalReferenceNumber(),
  filters: searchVehicleFiltersSchema.optional(),
}).refine((value) => value.listingId || value.listingNumber, {
  message: 'Either listingId or listingNumber is required',
  path: ['listingId'],
});

export const carDetailsSchema = z.object({
  carId: optionalUuid(),
  listingId: optionalUuid(),
  listingNumber: optionalReferenceNumber(),
  filters: searchVehicleFiltersSchema.optional(),
}).refine((value) => value.carId || value.listingId || value.listingNumber, {
  message: 'Either carId, listingId, or listingNumber is required',
  path: ['carId'],
});

export const vehicleDetailsSchema = z.object({
  vehicleId: z.string().trim().min(1).max(120),
});

export const reservationDetailsSchema = z.object({
  reservationId: optionalUuid(),
  reservationNumber: optionalReferenceNumber(),
}).refine((value) => value.reservationId || value.reservationNumber, {
  message: 'Either reservationId or reservationNumber is required',
  path: ['reservationId'],
});

export const cancelReservationActionSchema = reservationDetailsSchema;

export const listingAvailabilitySchema = z.object({
  listingId: z.string().uuid(),
});

export const reservationPriceSchema = z.object({
  listingId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date().optional(),
  durationDays: z.coerce.number().int().positive().max(365).optional(),
  pickupMethod: z.enum(['owner_place', 'renter_delivery']).optional().default('owner_place'),
}).refine((value) => value.endDate || value.durationDays, {
  message: 'Either endDate or durationDays is required',
  path: ['endDate'],
});

export const createReservationActionSchema = z.object({
  listingId: optionalUuid(),
  listingNumber: optionalReferenceNumber(),
  startDate: z.string().date(),
  endDate: z.string().date().optional(),
  durationDays: z.coerce.number().int().positive().max(365).optional(),
  pickupMethod: z.enum(['owner_place', 'company_place', 'renter_delivery']).optional().default('owner_place'),
  pickupAddress: z.string().trim().max(240).optional(),
}).refine((value) => value.listingId || value.listingNumber, {
  message: 'Either listingId or listingNumber is required',
  path: ['listingId'],
}).refine((value) => value.endDate || value.durationDays, {
  message: 'Either endDate or durationDays is required',
  path: ['endDate'],
});

export const leaveReviewActionSchema = z.object({
  reservationId: optionalUuid(),
  reservationNumber: optionalReferenceNumber(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
}).refine((value) => value.reservationId || value.reservationNumber, {
  message: 'Either reservationId or reservationNumber is required',
  path: ['reservationId'],
});

export const updateProfileActionSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
}).refine((value) => value.firstName !== undefined || value.lastName !== undefined || value.phone !== undefined, {
  message: 'At least one profile field is required',
  path: ['firstName'],
});

export const paymentStatusSchema = z.object({
  reservationId: z.string().uuid(),
});

export const vehicleReviewsSchema = z.object({
  vehicleId: z.string().trim().min(1).max(120),
  page: z.coerce.number().int().positive().max(20).optional().default(1),
  limit: z.coerce.number().int().positive().max(8).optional().default(5),
});

export const myReviewsSchema = z.object({
  page: z.coerce.number().int().positive().max(20).optional().default(1),
  limit: z.coerce.number().int().positive().max(8).optional().default(5),
});

export const assistantKnowledgeSearchSchema = z.object({
  query: z.string().trim().min(2).max(1000),
  categories: z.array(z.enum([
    'rental_policy',
    'insurance_terms',
    'faq',
    'vehicle_information',
    'terms_conditions',
    'support',
  ])).max(6).optional().default([]),
  limit: z.coerce.number().int().positive().max(8).optional().default(5),
  threshold: z.coerce.number().min(0).max(1).optional().default(0.72),
});
