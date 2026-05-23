import { z } from 'zod';

const ReservationStatus = z.enum([
    'confirmed',
    'cancelled',
    'reserved',
    'active',
    'return_pending',
    'refunded',
    'refund_pending',
    'pickup_pending',
    'payment_pending',
    'finished',
]);

const PickupMethod = z.enum(['owner_place', 'company_place', 'renter_delivery']);

export const createReservationSchema = z.object({
    listingId: z.string().uuid('listingId must be a valid UUID'),
    startDate: z.string().date('startDate must be a valid date (YYYY-MM-DD)'),
    endDate: z.string().date('endDate must be a valid date (YYYY-MM-DD)'),
    pickupMethod: PickupMethod.default('owner_place'),
    pickupAddress: z.string().trim().min(1).optional(),
}).refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
}).refine((data) => {
    if (data.pickupMethod === 'renter_delivery') return Boolean(data.pickupAddress);
    return true;
}, {
    message: 'pickupAddress is required when pickupMethod is renter_delivery',
    path: ['pickupAddress'],
});

export const updateStatusSchema = z.object({
    status: ReservationStatus,
    reason: z.string().optional(),
});

export const updateDetailsSchema = z.object({
    startDate: z.string().date('startDate must be a valid date (YYYY-MM-DD)').optional(),
    endDate: z.string().date('endDate must be a valid date (YYYY-MM-DD)').optional(),
}).refine((data) => {
    if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
}, {
    message: 'End date must be after start date',
    path: ['endDate'],
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
