import { z } from 'zod';

const ReservationStatus = z.enum([
    'confirmed',
    'cancelled',
    'reserved',
    'refunded',
    'refund_pending',
    'pickup_pending',
]);

export const createReservationSchema = z.object({
    listingId: z.string().uuid('listingId must be a valid UUID'),
    startDate: z.string().date('startDate must be a valid date (YYYY-MM-DD)'),
    endDate: z.string().date('endDate must be a valid date (YYYY-MM-DD)'),
    totalPrice: z.coerce.number().min(0, 'totalPrice must be >= 0'),
}).refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
});

export const updateStatusSchema = z.object({
    status: ReservationStatus,
    reason: z.string().optional(),
});

export const reservationFiltersSchema = z.object({
    status: ReservationStatus.optional(),
    renterId: z.string().uuid().optional(),
    listingId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const idParamSchema = z.object({
    id: z.string().uuid('id must be a valid UUID'),
});