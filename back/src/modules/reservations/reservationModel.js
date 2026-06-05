import { supabase } from '../../config/supabase.js';
import { hasApprovedDocument } from '../documents/documentModel.js';

const RESERVATIONS_TABLE = 'reservations';
const LISTINGS_TABLE = 'listings';
const USERS_TABLE = 'users';
const PICKUP_TABLE = 'pickup';

const PAYMENT_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours
const HANDOVER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isStatusTestMode = () => String(process.env.RESERVATION_STATUS_TEST_MODE || '').toLowerCase() === 'true';

const toUtcMidnightMs = (ymd) => {
    if (!ymd) return NaN;
    const ms = Date.parse(`${ymd}T00:00:00.000Z`);
    return Number.isFinite(ms) ? ms : NaN;
};

const calculateRentalDays = (startDate, endDate) => {
    const startMs = toUtcMidnightMs(startDate);
    const endMs = toUtcMidnightMs(endDate);
    const diff = endMs - startMs;
    if (!Number.isFinite(diff) || diff < 0) {
        throw new Error('endDate must be on or after startDate');
    }
    return Math.floor(diff / MS_PER_DAY) + 1;
};

const shouldOpenPickupWindow = (reservationRow) => {
    const startMs = toUtcMidnightMs(reservationRow?.start_date);
    if (!Number.isFinite(startMs)) return false;
    return Date.now() >= startMs - HANDOVER_WINDOW_MS;
};

const shouldOpenReturnWindow = (reservationRow) => {
    const endMs = toUtcMidnightMs(reservationRow?.end_date);
    if (!Number.isFinite(endMs)) return false;
    return Date.now() >= endMs - HANDOVER_WINDOW_MS;
};

const maybeAdvanceStatusInRow = async (reservationRow) => {
    if (!reservationRow?.id || !reservationRow?.status) return reservationRow;

    let nextStatus = null;
    if (reservationRow.status === 'confirmed' && shouldOpenPickupWindow(reservationRow)) {
        nextStatus = 'pickup_pending';
    } else if (reservationRow.status === 'active' && shouldOpenReturnWindow(reservationRow)) {
        nextStatus = 'return_pending';
    }

    if (!nextStatus) return reservationRow;

    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .update({ status: nextStatus })
        .eq('id', reservationRow.id)
        .select('id, status')
        .single();

    if (error || !data) return reservationRow;
    return { ...reservationRow, status: data.status };
};

// =========================================================
// DTO CONVERSION
// =========================================================

const toReservationDto = (row) => ({
    id: row.id,
    listingId: row.listing_id,
    renterId: row.renter_id,
    startDate: row.start_date,
    endDate: row.end_date,
    totalPrice: row.total_price,
    status: row.status,
    createdAt: row.created_at,
    pickup: (() => {
        const pickupRow = Array.isArray(row.pickup) ? row.pickup[0] : row.pickup;
        if (!pickupRow) return null;
        return {
            id: pickupRow.id,
            status: pickupRow.status,
            confirmedAt: pickupRow.confirmed_at,
            pickupMethod: pickupRow.pickup_method,
            pickupAddress: pickupRow.pickup_address,
            deliveryFee: pickupRow.delivery_fee,
        };
    })(),
    renter: (row.renter || row.users)
        ? {
            id: (row.renter || row.users).id,
            firstName: (row.renter || row.users).first_name,
            lastName: (row.renter || row.users).last_name,
            phone: (row.renter || row.users).phone,
            email: (row.renter || row.users).email,
        }
        : null,
    listing: row.listings ? {
        id: row.listings.id,
        carId: row.listings.car_id,
        title: row.listings.title,
        city: row.listings.city,
        country: row.listings.country,
        pricePerDay: row.listings.price_per_day,
        pricePerWeek: row.listings.price_per_week,
        pricePerMonth: row.listings.price_per_month,
        pickupAddress: row.listings.pickup_address,
        deliveryFee: row.listings.delivery_fee,
        car: row.listings.cars ? {
            id: row.listings.cars.id,
            ownerId: row.listings.cars.owner_id,
            brand: row.listings.cars.brand,
            model: row.listings.cars.model,
            year: row.listings.cars.year,
            seats: row.listings.cars.seats,
            transmission: row.listings.cars.transmission,
            fuelType: row.listings.cars.fuel_type,
            carImages: row.listings.cars.car_images || [],
        } : null,
    } : null,
});

const toReservationTablePayload = (payload) => {
    const mapped = {};

    if (payload.listingId !== undefined) mapped.listing_id = payload.listingId;
    if (payload.renterId !== undefined) mapped.renter_id = payload.renterId;
    if (payload.startDate !== undefined) mapped.start_date = payload.startDate;
    if (payload.endDate !== undefined) mapped.end_date = payload.endDate;
    if (payload.totalPrice !== undefined) mapped.total_price = payload.totalPrice;
    if (payload.status !== undefined) mapped.status = payload.status;

    return mapped;
};

// =========================================================
// DATE CONFLICT CHECKER
// =========================================================

export const checkDateConflict = async (listingId, startDate, endDate) => {
    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .select('id')
        .eq('listing_id', listingId)
        .in('status', ['reserved', 'confirmed', 'pickup_pending'])
        .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

    if (error) throw error;
    return data && data.length > 0;
};

export const calculateListingReservationPrice = async ({
    listingId,
    startDate,
    endDate,
    pickupMethod = 'owner_place',
}) => {
    const { data: listingData, error: listingError } = await supabase
        .from(LISTINGS_TABLE)
        .select('id, title, price_per_day, price_per_week, price_per_month, pickup_address, delivery_fee')
        .eq('id', listingId)
        .single();

    if (listingError || !listingData) {
        throw new Error('Listing not found or has no pricing');
    }

    if (!listingData.price_per_day) {
        throw new Error('Listing does not have daily price set');
    }

    const totalDays = calculateRentalDays(startDate, endDate);
    let remainingDays = totalDays;
    let totalPrice = 0;
    const breakdown = [];

    if (remainingDays >= 30 && listingData.price_per_month) {
        const months = Math.floor(remainingDays / 30);
        const amount = months * Number(listingData.price_per_month);
        totalPrice += amount;
        remainingDays -= months * 30;
        breakdown.push({ label: `${months} month(s)`, amount });
    }

    if (remainingDays >= 7 && listingData.price_per_week) {
        const weeks = Math.floor(remainingDays / 7);
        const amount = weeks * Number(listingData.price_per_week);
        totalPrice += amount;
        remainingDays -= weeks * 7;
        breakdown.push({ label: `${weeks} week(s)`, amount });
    }

    if (remainingDays > 0) {
        const amount = remainingDays * Number(listingData.price_per_day);
        totalPrice += amount;
        breakdown.push({ label: `${remainingDays} day(s)`, amount });
    }

    const listingDeliveryFee = Number(listingData.delivery_fee || 0);
    const normalizedPickupMethod = pickupMethod || 'owner_place';
    let deliveryFeeApplied = 0;
    let pickupAddressSnapshot = listingData.pickup_address || null;

    if (normalizedPickupMethod === 'renter_delivery') {
        if (listingDeliveryFee <= 0) {
            throw new Error('This listing does not support delivery');
        }
        deliveryFeeApplied = listingDeliveryFee;
        pickupAddressSnapshot = null;
        totalPrice += deliveryFeeApplied;
        breakdown.push({ label: 'Delivery fee', amount: deliveryFeeApplied });
    } else if (!pickupAddressSnapshot) {
        throw new Error('Listing pickup address is missing');
    }

    if (isNaN(totalPrice) || !isFinite(totalPrice)) {
        throw new Error('Failed to calculate reservation price');
    }

    return {
        listing: listingData,
        startDate,
        endDate,
        pickupMethod: normalizedPickupMethod,
        totalDays,
        totalPrice,
        breakdown,
        deliveryFeeApplied,
        pickupAddressSnapshot,
    };
};

// =========================================================
// DATABASE FUNCTIONS
// =========================================================

export const getReservations = async (filters = {}) => {
    const { status, renterId, listingId, page = 1, limit = 10 } = filters;

    let query = supabase
        .from(RESERVATIONS_TABLE)
        .select('*, pickup(*)')
        .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq('status', status);
    if (renterId) query = query.eq('renter_id', renterId);
    if (listingId) query = query.eq('listing_id', listingId);

    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    const advanced = await Promise.all(rows.map(maybeAdvanceStatusInRow));
    return advanced.map(toReservationDto);
};

export const getReservationById = async (id) => {
    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .select(
            '*, pickup(*), listings(id, car_id, title, city, country, price_per_day, price_per_week, price_per_month, pickup_address, delivery_fee, cars(id, owner_id, brand, model, year, seats, transmission, fuel_type, car_images(id, image_url, is_primary))), users(id, first_name, last_name, phone, email)'
        )
        .eq('id', id)
        .single();

    if (error || !data) throw new Error('Reservation not found');

    const advanced = await maybeAdvanceStatusInRow(data);

    // Attach renter contact if not included by relations.
    if (!advanced.users && advanced.renter_id) {
        const { data: renter, error: renterError } = await supabase
            .from(USERS_TABLE)
            .select('id, first_name, last_name, phone, email')
            .eq('id', advanced.renter_id)
            .single();
        if (!renterError && renter) advanced.users = renter;
    }

    // Auto-cancel unpaid reservations that exceeded grace period
    if (['reserved'].includes(advanced.status) && advanced.created_at) {
        const createdAtMs = new Date(advanced.created_at).getTime();
        if (!Number.isNaN(createdAtMs) && Date.now() - createdAtMs > PAYMENT_GRACE_MS) {
            const { data: cancelled, error: cancelError } = await supabase
                .from(RESERVATIONS_TABLE)
                .update({ status: 'cancelled' })
                .eq('id', id)
                .select(
                    '*, listings(id, car_id, title, city, country, price_per_day, price_per_week, price_per_month, cars(id, owner_id, brand, model, year, seats, transmission, fuel_type, car_images(id, image_url, is_primary))), users(id, first_name, last_name, phone, email)'
                )
                .single();
            if (!cancelError && cancelled) {
                if (!cancelled.users && cancelled.renter_id) {
                    const { data: renter, error: renterError } = await supabase
                        .from(USERS_TABLE)
                        .select('id, first_name, last_name, phone, email')
                        .eq('id', cancelled.renter_id)
                        .single();
                    if (!renterError && renter) cancelled.users = renter;
                }
                return toReservationDto(cancelled);
            }
        }
    }

    return toReservationDto(advanced);
};

const assertTransitionAllowed = (fromStatus, toStatus, reservationRow) => {
    if (isStatusTestMode()) return;

    const allowed = {
        reserved: new Set(['confirmed', 'cancelled']),
        confirmed: new Set(['pickup_pending', 'cancelled']),
        pickup_pending: new Set(['active', 'cancelled']),
        active: new Set(['return_pending']),
        return_pending: new Set(['refund_pending']),
        refund_pending: new Set(['refunded']),
        payment_pending: new Set(['confirmed', 'cancelled']),
        finished: new Set([]),
    };

    const targets = allowed[fromStatus];
    if (!targets || !targets.has(toStatus)) {
        throw new Error(`Invalid status transition: ${fromStatus} -> ${toStatus}`);
    }

    if (fromStatus === 'confirmed' && toStatus === 'pickup_pending') {
        if (!shouldOpenPickupWindow(reservationRow)) {
            throw new Error('Pickup is only available within 24 hours before start date.');
        }
    }

    if (fromStatus === 'active' && toStatus === 'return_pending') {
        if (!shouldOpenReturnWindow(reservationRow)) {
            throw new Error('Return is only available within 24 hours before end date.');
        }
    }
};

export const createReservation = async (payload, renterId) => {
    const clientHasApprovedLicense = await hasApprovedDocument({
        userId: renterId,
        documentType: 'driver_license',
    });

    if (!clientHasApprovedLicense) {
        throw new Error('CLIENT_VERIFICATION_REQUIRED');
    }

    // Check for date conflicts
    const conflict = await checkDateConflict(
        payload.listingId,
        payload.startDate,
        payload.endDate
    );

    if (conflict) {
        throw new Error('Selected dates are not available');
    }

    const pickupMethod = payload.pickupMethod || 'owner_place';
    const pricing = await calculateListingReservationPrice({
        listingId: payload.listingId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        pickupMethod,
    });
    const pickupAddressSnapshot = pickupMethod === 'renter_delivery'
        ? payload.pickupAddress || null
        : pricing.pickupAddressSnapshot;

    const insertPayload = toReservationTablePayload({
        ...payload,
        renterId,
        totalPrice: pricing.totalPrice,
        status: 'reserved', // Initial status
    });

    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .insert([insertPayload])
        .select()
        .single();

    if (error) throw error;

    const { error: pickupError } = await supabase
        .from(PICKUP_TABLE)
        .insert([{
            reservation_id: data.id,
            status: 'pending',
            pickup_method: pickupMethod,
            pickup_address: pickupAddressSnapshot,
            delivery_fee: pricing.deliveryFeeApplied,
        }]);

    if (pickupError) {
        await supabase.from(RESERVATIONS_TABLE).delete().eq('id', data.id);
        throw pickupError;
    }

    const { data: created, error: fetchCreatedError } = await supabase
        .from(RESERVATIONS_TABLE)
        .select(
            '*, pickup(*), listings(id, car_id, title, city, country, price_per_day, price_per_week, price_per_month, pickup_address, delivery_fee, cars(id, owner_id, brand, model, year, seats, transmission, fuel_type, car_images(id, image_url, is_primary))), users(id, first_name, last_name, phone, email)'
        )
        .eq('id', data.id)
        .single();

    if (fetchCreatedError || !created) throw new Error('Failed to fetch created reservation');
    return toReservationDto(created);
};

export const updateReservationStatus = async (id, newStatus) => {
    const { data: existing, error: fetchError } = await supabase
        .from(RESERVATIONS_TABLE)
        .select('id, status, start_date, end_date')
        .eq('id', id)
        .single();
    if (fetchError || !existing) throw new Error('Reservation not found');

    assertTransitionAllowed(existing.status, newStatus, existing);

    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single();

    if (error || !data) throw new Error('Failed to update reservation status');

    // Test helper: allow re-testing pickup verification by clearing pickup verification fields
    // when a reservation is moved back into pickup_pending.
    if (isStatusTestMode() && newStatus === 'pickup_pending') {
        const { error: pickupResetError } = await supabase
            .from(PICKUP_TABLE)
            .update({
                status: 'pending',
                confirmed_at: null,
                pickup_code_hash: null,
                pickup_qr_token_hash: null,
                pickup_code_expires_at: null,
                pickup_attempts: 0,
                pickup_verified_at: null,
                pickup_verified_by: null,
            })
            .eq('reservation_id', id);
        if (pickupResetError) throw pickupResetError;
    }

    return toReservationDto(data);
};

export const updateReservationDetails = async (id, updates) => {
    // Fetch existing reservation
    const { data: existingReservation, error: fetchError } = await supabase
        .from(RESERVATIONS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !existingReservation) {
        throw new Error('Reservation not found');
    }

    // Use existing dates if not provided in updates
    const nextStartDate = updates.startDate || existingReservation.start_date;
    const nextEndDate = updates.endDate || existingReservation.end_date;
    const startDate = new Date(nextStartDate);
    const endDate = new Date(nextEndDate);
    const requestedPickupMethod = updates.pickupMethod || null;

    // Check for date conflicts (exclude current reservation)
    if (updates.startDate || updates.endDate) {
        const { data: conflicts, error: conflictError } = await supabase
            .from(RESERVATIONS_TABLE)
            .select('id')
            .eq('listing_id', existingReservation.listing_id)
            .neq('id', id) // Exclude this reservation
            .in('status', ['reserved', 'confirmed', 'pickup_pending'])
            .or(`and(start_date.lte.${endDate.toISOString().split('T')[0]},end_date.gte.${startDate.toISOString().split('T')[0]})`);

        if (!conflictError && conflicts && conflicts.length > 0) {
            throw new Error('Selected dates are not available');
        }
    }

    // Fetch pickup details (delivery fee snapshot)
    const { data: pickupRows, error: pickupFetchError } = await supabase
        .from(PICKUP_TABLE)
        .select('delivery_fee, pickup_method, pickup_address')
        .eq('reservation_id', id)
        .limit(1);

    if (pickupFetchError) throw pickupFetchError;
    const currentPickupRow = pickupRows && pickupRows[0] ? pickupRows[0] : null;
    const currentPickupMethod = currentPickupRow?.pickup_method || 'owner_place';
    const currentPickupAddress = currentPickupRow?.pickup_address || null;

    const nextPickupMethod = requestedPickupMethod || currentPickupMethod;
    let nextPickupAddress = currentPickupAddress;

    if (requestedPickupMethod) {
        if (requestedPickupMethod === 'renter_delivery') {
            const requestedAddress = updates.pickupAddress?.trim?.() || updates.pickupAddress || null;
            if (!requestedAddress) {
                throw new Error('pickupAddress is required when pickupMethod is renter_delivery');
            }
            nextPickupAddress = requestedAddress;
        } else {
            nextPickupAddress = null;
        }
    }

    const pricing = await calculateListingReservationPrice({
        listingId: existingReservation.listing_id,
        startDate: nextStartDate,
        endDate: nextEndDate,
        pickupMethod: nextPickupMethod,
    });

    if (nextPickupMethod === 'renter_delivery') {
        nextPickupAddress = nextPickupAddress || currentPickupAddress;
        if (!nextPickupAddress) {
            throw new Error('pickupAddress is required when pickupMethod is renter_delivery');
        }
    } else {
        nextPickupAddress = pricing.pickupAddressSnapshot;
    }

    // Prepare update payload
    const updatePayload = {
        start_date: nextStartDate,
        end_date: nextEndDate,
        total_price: pricing.totalPrice,
    };

    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

    if (error || !data) throw new Error('Failed to update reservation');

    const { error: pickupUpdateError } = await supabase
        .from(PICKUP_TABLE)
        .update({
            pickup_method: nextPickupMethod,
            pickup_address: nextPickupAddress,
            delivery_fee: pricing.deliveryFeeApplied,
        })
        .eq('reservation_id', id);
    if (pickupUpdateError) throw pickupUpdateError;

    const { data: full, error: fullError } = await supabase
        .from(RESERVATIONS_TABLE)
        .select(
            '*, pickup(*), listings(id, car_id, title, city, country, price_per_day, price_per_week, price_per_month, pickup_address, delivery_fee, cars(id, owner_id, brand, model, year, seats, transmission, fuel_type, car_images(id, image_url, is_primary))), users(id, first_name, last_name, phone, email)'
        )
        .eq('id', id)
        .single();
    if (fullError || !full) throw new Error('Failed to fetch updated reservation');
    return toReservationDto(full);
};

export const getReservationsByRenter = async (renterId) => {
    // Auto-cancel unpaid reservations older than grace period
    const cutoffIso = new Date(Date.now() - PAYMENT_GRACE_MS).toISOString();
    await supabase
        .from(RESERVATIONS_TABLE)
        .update({ status: 'cancelled' })
        .eq('renter_id', renterId)
        .in('status', ['reserved'])
        .lt('created_at', cutoffIso);

    // Include listing and nested car data with images so frontend can display details without extra requests
    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .select(
            '*, pickup(*), listings(id, car_id, title, city, country, price_per_day, price_per_week, price_per_month, pickup_address, delivery_fee, cars(id, owner_id, brand, model, year, seats, transmission, fuel_type, car_images(id, image_url, is_primary)))'
        )
        .eq('renter_id', renterId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(toReservationDto);
};

export const getListingReservations = async (listingId) => {
    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .select(
            '*, pickup(*), users(id, first_name, last_name, phone, email), listings(id, car_id, title, city, country, price_per_day, price_per_week, price_per_month, pickup_address, delivery_fee, cars(id, owner_id, brand, model, year, seats, transmission, fuel_type, car_images(id, image_url, is_primary)))'
        )
        .eq('listing_id', listingId)
        .order('start_date', { ascending: true });

    if (error) throw error;
    const rows = data || [];

    // Fallback: if relation "users" isn't wired in Supabase for renter_id, hydrate renters manually.
    const missingRenterIds = [
        ...new Set(rows.filter((row) => !row?.users && row?.renter_id).map((row) => row.renter_id)),
    ];

    if (missingRenterIds.length > 0) {
        const { data: renters, error: renterError } = await supabase
            .from(USERS_TABLE)
            .select('id, first_name, last_name, phone, email')
            .in('id', missingRenterIds);

        if (!renterError) {
            const renterById = {};
            (renters || []).forEach((renter) => {
                renterById[renter.id] = renter;
            });
            rows.forEach((row) => {
                if (!row.users && row.renter_id) row.renter = renterById[row.renter_id] || null;
            });
        }
    }

    return rows.map(toReservationDto);
};

// =========================================================
// AVAILABILITY CALENDAR DATA (PUBLIC)
// =========================================================

/**
 * Get listing availability for calendar
 * Combines: listing available dates + non-cancelled reservations
 */
export const getListingAvailability = async (listingId) => {
    // Fetch listing availability window
    const { data: listing, error: listingError } = await supabase
        .from(LISTINGS_TABLE)
        .select('available_from, available_to')
        .eq('id', listingId)
        .single();

    if (listingError || !listing) {
        throw new Error('Listing not found');
    }

    // Fetch all non-cancelled reservations for this listing
    const { data: reservations, error: resError } = await supabase
        .from(RESERVATIONS_TABLE)
        .select('start_date, end_date, status')
        .eq('listing_id', listingId)
        .in('status', ['reserved', 'confirmed', 'pickup_pending']);

    if (resError) throw resError;

    // Build blocked dates array
    const blockedDates = [];
    (reservations || []).forEach(reservation => {
        const startDate = new Date(reservation.start_date);
        const endDate = new Date(reservation.end_date);
        
        // Mark all dates in reservation range as blocked
        const current = new Date(startDate);
        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            if (!blockedDates.includes(dateStr)) {
                blockedDates.push(dateStr);
            }
            current.setDate(current.getDate() + 1);
        }
    });

    return {
        availableFrom: listing.available_from,
        availableTo: listing.available_to,
        blockedDates: blockedDates.sort(),
    };
};
