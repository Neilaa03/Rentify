import { supabase } from '../../config/supabase.js';

const RESERVATIONS_TABLE = 'reservations';
const LISTINGS_TABLE = 'listings';
const USERS_TABLE = 'users';

const PAYMENT_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    listing: row.listings ? {
        id: row.listings.id,
        carId: row.listings.car_id,
        city: row.listings.city,
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

// =========================================================
// DATABASE FUNCTIONS
// =========================================================

export const getReservations = async (filters = {}) => {
    const { status, renterId, listingId, page = 1, limit = 10 } = filters;

    let query = supabase
        .from(RESERVATIONS_TABLE)
        .select('*')
        .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq('status', status);
    if (renterId) query = query.eq('renter_id', renterId);
    if (listingId) query = query.eq('listing_id', listingId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(toReservationDto);
};

export const getReservationById = async (id) => {
    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .select('*, listings(id, car_id, city, cars(id, owner_id, brand, model, year, seats, transmission, fuel_type, car_images(id, image_url, is_primary)))')
        .eq('id', id)
        .single();

    if (error || !data) throw new Error('Reservation not found');

    // Auto-cancel unpaid reservations that exceeded grace period
    if (data.status === 'reserved' && data.created_at) {
        const createdAtMs = new Date(data.created_at).getTime();
        if (!Number.isNaN(createdAtMs) && Date.now() - createdAtMs > PAYMENT_GRACE_MS) {
            const { data: cancelled, error: cancelError } = await supabase
                .from(RESERVATIONS_TABLE)
                .update({ status: 'cancelled' })
                .eq('id', id)
                .select('*, listings(id, car_id, city, cars(id, owner_id, brand, model, year, seats, transmission, fuel_type, car_images(id, image_url, is_primary)))')
                .single();
            if (!cancelError && cancelled) return toReservationDto(cancelled);
        }
    }

    return toReservationDto(data);
};

export const createReservation = async (payload, renterId) => {
    // Check for date conflicts
    const conflict = await checkDateConflict(
        payload.listingId,
        payload.startDate,
        payload.endDate
    );

    if (conflict) {
        throw new Error('Selected dates are not available');
    }

    // Fetch listing to get pricing
    const { data: listingData, error: listingError } = await supabase
        .from(LISTINGS_TABLE)
        .select('price_per_day, price_per_week, price_per_month')
        .eq('id', payload.listingId)
        .single();

    if (listingError || !listingData) {
        throw new Error('Listing not found or has no pricing');
    }

    // Validate price_per_day exists (required)
    if (!listingData.price_per_day) {
        throw new Error('Listing does not have daily price set');
    }

    // Calculate total price based on days, weeks, and months
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1; // +1 to include both start and end dates

    let totalPrice = 0;
    let remainingDays = totalDays;

    // Apply monthly pricing first (if available)
    if (remainingDays >= 30 && listingData.price_per_month) {
        const fullMonths = Math.floor(remainingDays / 30);
        totalPrice += fullMonths * listingData.price_per_month;
        remainingDays -= fullMonths * 30;
    }

    // Apply weekly pricing (if available)
    if (remainingDays >= 7 && listingData.price_per_week) {
        const fullWeeks = Math.floor(remainingDays / 7);
        totalPrice += fullWeeks * listingData.price_per_week;
        remainingDays -= fullWeeks * 7;
    }

    // Apply daily pricing for remaining days
    totalPrice += remainingDays * listingData.price_per_day;

    // Validate totalPrice is a valid number
    if (isNaN(totalPrice) || !isFinite(totalPrice)) {
        throw new Error('Failed to calculate reservation price');
    }

    const insertPayload = toReservationTablePayload({
        ...payload,
        renterId,
        totalPrice,
        status: 'reserved', // Initial status
    });

    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .insert([insertPayload])
        .select()
        .single();

    if (error) throw error;
    return toReservationDto(data);
};

export const updateReservationStatus = async (id, newStatus) => {
    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single();

    if (error || !data) throw new Error('Failed to update reservation status');
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
    const startDate = updates.startDate ? new Date(updates.startDate) : new Date(existingReservation.start_date);
    const endDate = updates.endDate ? new Date(updates.endDate) : new Date(existingReservation.end_date);

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

    // Fetch listing to recalculate price
    const { data: listingData, error: listingError } = await supabase
        .from(LISTINGS_TABLE)
        .select('price_per_day, price_per_week, price_per_month')
        .eq('id', existingReservation.listing_id)
        .single();

    if (listingError || !listingData || !listingData.price_per_day) {
        throw new Error('Listing pricing not found');
    }

    // Recalculate total price based on new dates
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    let totalPrice = 0;
    let remainingDays = totalDays;

    // Apply monthly pricing first
    if (remainingDays >= 30 && listingData.price_per_month) {
        const fullMonths = Math.floor(remainingDays / 30);
        totalPrice += fullMonths * listingData.price_per_month;
        remainingDays -= fullMonths * 30;
    }

    // Apply weekly pricing
    if (remainingDays >= 7 && listingData.price_per_week) {
        const fullWeeks = Math.floor(remainingDays / 7);
        totalPrice += fullWeeks * listingData.price_per_week;
        remainingDays -= fullWeeks * 7;
    }

    // Apply daily pricing for remaining days
    totalPrice += remainingDays * listingData.price_per_day;

    // Prepare update payload
    const updatePayload = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        total_price: totalPrice,
    };

    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

    if (error || !data) throw new Error('Failed to update reservation');
    return toReservationDto(data);
};

export const getReservationsByRenter = async (renterId) => {
    // Auto-cancel unpaid reservations older than grace period
    const cutoffIso = new Date(Date.now() - PAYMENT_GRACE_MS).toISOString();
    await supabase
        .from(RESERVATIONS_TABLE)
        .update({ status: 'cancelled' })
        .eq('renter_id', renterId)
        .eq('status', 'reserved')
        .lt('created_at', cutoffIso);

    // Include listing and nested car data with images so frontend can display details without extra requests
    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .select('*, listings(id, car_id, city, price_per_day, price_per_week, price_per_month, cars(id, owner_id, brand, model, car_images(id, image_url, is_primary)))')
        .eq('renter_id', renterId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(toReservationDto);
};

export const getListingReservations = async (listingId) => {
    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .select('*')
        .eq('listing_id', listingId)
        .order('start_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(toReservationDto);
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
