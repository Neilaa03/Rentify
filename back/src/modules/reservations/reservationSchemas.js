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
const DELIVERY_ADDRESS_REGEX = /^\d+\s+[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+)*\s+\d{4,5}\s+[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+)*$/u;
const DELIVERY_ADDRESS_HINT = 'Format attendu: "12 Rue Exemple 16000 Alger"';

const deliveryAddressSchema = z
    .string()
    .trim()
    .min(1)
    .refine((value) => DELIVERY_ADDRESS_REGEX.test(value), {
        message: DELIVERY_ADDRESS_HINT,
    });

export const createReservationSchema = z.object({
    listingId: z.string().uuid('listingId must be a valid UUID'),
    startDate: z.string().date('startDate must be a valid date (YYYY-MM-DD)'),
    endDate: z.string().date('endDate must be a valid date (YYYY-MM-DD)'),
    pickupMethod: PickupMethod.default('owner_place'),
    pickupAddress: deliveryAddressSchema.optional(),
}).refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
}).refine((data) => {
    if (data.pickupMethod === 'renter_delivery') return Boolean(data.pickupAddress);
    return true;
}, {
    message: 'pickupAddress is required when pickupMethod is renter_delivery',
    path: ['pickupAddress'],
}).refine((data) => {
    if (data.pickupMethod === 'renter_delivery' && data.pickupAddress) {
        return DELIVERY_ADDRESS_REGEX.test(data.pickupAddress);
    }
    return true;
}, {
    message: DELIVERY_ADDRESS_HINT,
    path: ['pickupAddress'],
});

export const updateStatusSchema = z.object({
    status: ReservationStatus,
    reason: z.string().optional(),
});

export const updateDetailsSchema = z.object({
    startDate: z.string().date('startDate must be a valid date (YYYY-MM-DD)').optional(),
    endDate: z.string().date('endDate must be a valid date (YYYY-MM-DD)').optional(),
    pickupMethod: PickupMethod.optional(),
    pickupAddress: deliveryAddressSchema.optional(),
}).refine((data) => {
    if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
}, {
    message: 'End date must be after start date',
    path: ['endDate'],
}).refine((data) => {
    if (data.pickupMethod === 'renter_delivery') {
        return Boolean(data.pickupAddress && data.pickupAddress.trim());
    }
    return true;
}, {
    message: 'pickupAddress is required when pickupMethod is renter_delivery',
    path: ['pickupAddress'],
}).refine((data) => {
    if (data.pickupMethod === 'renter_delivery' && data.pickupAddress) {
        return DELIVERY_ADDRESS_REGEX.test(data.pickupAddress);
    }
    return true;
}, {
    message: DELIVERY_ADDRESS_HINT,
    path: ['pickupAddress'],
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
