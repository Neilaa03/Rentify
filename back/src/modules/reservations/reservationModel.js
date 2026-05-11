import { supabase } from '../../config/supabase.js';

const RESERVATIONS_TABLE = 'reservations';
const LISTINGS_TABLE = 'listings';
const USERS_TABLE = 'users';

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
        car: row.listings.cars ? {
            id: row.listings.cars.id,
            ownerId: row.listings.cars.owner_id,
            brand: row.listings.cars.brand,
            model: row.listings.cars.model,
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
        .select('*, listings(id, car_id, cars(id, owner_id, brand, model))')
        .eq('id', id)
        .single();

    if (error || !data) throw new Error('Reservation not found');
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

    const insertPayload = toReservationTablePayload({
        ...payload,
        renterId,
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
    const updatePayload = toReservationTablePayload(updates);

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
    const { data, error } = await supabase
        .from(RESERVATIONS_TABLE)
        .select('*')
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