import crypto from 'crypto';
import { supabase } from '../../config/supabase.js';
import { getClientProfileStats, getOwnerProfileStats } from '../profile/profileModel.js';
import { getListings, getListingById } from '../car-listings/listingModel.js';
import { getCarById } from '../cars/carModel.js';
import { getUserById, updateUserById } from '../auth/authModel.js';
import { getUserFavorites } from '../favorites/favoritesModel.js';
import {
  createReview as createReviewRecord,
  getCarReviewSummary,
  getReservationForReview,
  getReviewCountForReservationByReviewer,
  getReviewsByCarId,
} from '../reviews/reviewModel.js';
import { getPaymentByReservationId } from '../payments/paymentDbModel.js';
import {
  createReservation as createReservationRecord,
  updateReservationStatus,
} from '../reservations/reservationModel.js';

const RESERVATION_SELECT =
  'id, listing_id, renter_id, start_date, end_date, total_price, status, created_at, pickup(status, pickup_method, pickup_address, delivery_fee), listings(id, car_id, title, city, country, price_per_day, price_per_week, price_per_month, pickup_address, delivery_fee, cars(id, owner_id, brand, model, year, seats, transmission, fuel_type, car_images(id, image_url, is_primary)))';

const toReservationSummary = (row) => {
  const pickup = Array.isArray(row.pickup) ? row.pickup[0] : row.pickup;
  const listing = row.listings || null;
  const car = listing?.cars || null;

  return {
    id: row.id,
    listingId: row.listing_id,
    renterId: row.renter_id,
    startDate: row.start_date,
    endDate: row.end_date,
    totalPrice: row.total_price,
    status: row.status,
    createdAt: row.created_at,
    pickup: pickup ? {
      status: pickup.status,
      method: pickup.pickup_method,
      address: pickup.pickup_address,
      deliveryFee: pickup.delivery_fee,
    } : null,
    listing: listing ? {
      id: listing.id,
      title: listing.title,
      city: listing.city,
      country: listing.country,
      pricePerDay: listing.price_per_day,
      car: car ? {
        id: car.id,
        ownerId: car.owner_id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        seats: car.seats,
        transmission: car.transmission,
        fuelType: car.fuel_type,
        primaryImage: (car.car_images || []).find((image) => image.is_primary)?.image_url || car.car_images?.[0]?.image_url || null,
      } : null,
    } : null,
  };
};

export const createConversationId = () => crypto.randomUUID();

export const getReservationsForUser = async (userId) => {
  const { data, error } = await supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('renter_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data || []).map(toReservationSummary);
};

export const getReservationDetailsReadOnly = async ({ reservationId, reservationNumber, user }) => {
  if (reservationNumber) {
    const reservations = await getReservationsForUser(user.id);
    const reservation = reservations[reservationNumber - 1];
    if (!reservation) throw new Error(`Reservation ${reservationNumber} was not found in your latest reservations`);
    return {
      ...reservation,
      referenceNumber: reservationNumber,
    };
  }

  const { data, error } = await supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('id', reservationId)
    .single();

  if (error || !data) throw new Error('Reservation not found');

  const summary = toReservationSummary(data);
  const isRenter = summary.renterId === user.id;
  const isOwner = summary.listing?.car?.ownerId === user.id;
  const isStaff = ['admin', 'companyManager'].includes(user.role);
  if (!isRenter && !isOwner && !isStaff) throw new Error('Access denied');

  return summary;
};

export const searchVehiclesReadOnly = async (filters) => {
  const result = await getListings({
    ...filters,
    page: filters.page || 1,
    limit: Math.min(filters.limit || 5, 8),
  });

  return {
    items: result.items || [],
    pagination: result.pagination,
  };
};

export const getVehicleDetailsReadOnly = async (vehicleId) => {
  return getListingById(vehicleId);
};

export const getListingDetailsReadOnly = async ({ listingId, listingNumber, filters = {} }) => {
  if (listingNumber) {
    const result = await searchVehiclesReadOnly({ ...filters, limit: Math.max(listingNumber, filters.limit || 5) });
    const listing = result.items[listingNumber - 1];
    if (!listing) throw new Error(`Listing ${listingNumber} was not found in the current search results`);
    return {
      ...listing,
      referenceNumber: listingNumber,
    };
  }

  return getListingById(listingId);
};

export const getCarDetailsReadOnly = async ({ carId, listingId, listingNumber, filters = {} }) => {
  if (listingId || listingNumber) {
    const listing = await getListingDetailsReadOnly({ listingId, listingNumber, filters });
    if (!listing.car) throw new Error('Car details not found for this listing');
    return {
      ...listing.car,
      referenceNumber: listing.referenceNumber,
      listing: {
        id: listing.id,
        title: listing.title,
        city: listing.city,
        country: listing.country,
        pricePerDay: listing.pricePerDay,
        pricePerWeek: listing.pricePerWeek,
        pricePerMonth: listing.pricePerMonth,
        availableFrom: listing.availableFrom,
        availableTo: listing.availableTo,
        isActive: listing.isActive,
      },
    };
  }

  return getCarById(carId);
};

export const getListingAvailabilityReadOnly = async (listingId) => {
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, title, available_from, available_to')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) throw new Error('Listing not found');

  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('id, start_date, end_date, status')
    .eq('listing_id', listingId)
    .in('status', ['reserved', 'confirmed', 'pickup_pending']);

  if (error) throw error;

  return {
    listingId: listing.id,
    title: listing.title,
    availableFrom: listing.available_from,
    availableTo: listing.available_to,
    blockedRanges: (reservations || []).map((reservation) => ({
      reservationId: reservation.id,
      startDate: reservation.start_date,
      endDate: reservation.end_date,
      status: reservation.status,
    })),
  };
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseYmdToUtcMs = (date) => {
  const ms = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) throw new Error('Invalid reservation date');
  return ms;
};

const addDaysYmd = (date, daysToAdd) => {
  const next = new Date(parseYmdToUtcMs(date) + (daysToAdd * MS_PER_DAY));
  return next.toISOString().split('T')[0];
};

const calculateRentalDays = (startDate, endDate) => {
  const diff = parseYmdToUtcMs(endDate) - parseYmdToUtcMs(startDate);
  if (!Number.isFinite(diff) || diff < 0) throw new Error('endDate must be on or after startDate');
  return Math.floor(diff / MS_PER_DAY) + 1;
};

export const calculateReservationPriceReadOnly = async ({ listingId, startDate, endDate, durationDays, pickupMethod }) => {
  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, title, price_per_day, price_per_week, price_per_month, delivery_fee, pickup_address')
    .eq('id', listingId)
    .single();

  if (error || !listing) throw new Error('Listing not found');
  if (!listing.price_per_day) throw new Error('Listing daily price is missing');

  const totalDays = durationDays ? Number(durationDays) : calculateRentalDays(startDate, endDate);
  const resolvedEndDate = durationDays ? addDaysYmd(startDate, totalDays - 1) : endDate;
  let remainingDays = totalDays;
  let totalPrice = 0;
  const breakdown = [];

  if (remainingDays >= 30 && listing.price_per_month) {
    const months = Math.floor(remainingDays / 30);
    const amount = months * Number(listing.price_per_month);
    totalPrice += amount;
    remainingDays -= months * 30;
    breakdown.push({ label: `${months} month(s)`, amount });
  }

  if (remainingDays >= 7 && listing.price_per_week) {
    const weeks = Math.floor(remainingDays / 7);
    const amount = weeks * Number(listing.price_per_week);
    totalPrice += amount;
    remainingDays -= weeks * 7;
    breakdown.push({ label: `${weeks} week(s)`, amount });
  }

  if (remainingDays > 0) {
    const amount = remainingDays * Number(listing.price_per_day);
    totalPrice += amount;
    breakdown.push({ label: `${remainingDays} day(s)`, amount });
  }

  const deliveryFee = pickupMethod === 'renter_delivery' ? Number(listing.delivery_fee || 0) : 0;
  if (deliveryFee > 0) {
    totalPrice += deliveryFee;
    breakdown.push({ label: 'Delivery fee', amount: deliveryFee });
  }

  return {
    listingId,
    title: listing.title,
    startDate,
    endDate: resolvedEndDate,
    pickupMethod,
    totalDays,
    totalPrice,
    currency: 'EUR',
    breakdown,
    note: 'Estimate only. No reservation was created.',
  };
};

const getReservationActionTarget = async ({ reservationId, reservationNumber, user }) => {
  const reservation = await getReservationDetailsReadOnly({ reservationId, reservationNumber, user });
  if (reservation.renterId !== user.id) throw new Error('You can only perform this action on your own reservations');
  return reservation;
};

const getReservationTitle = (reservation) => {
  const car = reservation.listing?.car;
  return car ? `${car.brand || ''} ${car.model || ''}`.trim() : reservation.listing?.title || 'reservation';
};

const createPendingAction = ({ actionType, summary, payload, preview }) => ({
  id: crypto.randomUUID(),
  actionType,
  status: 'pending_confirmation',
  requiresConfirmation: true,
  confirmationText: 'Reply yes to confirm, or no to cancel.',
  summary,
  payload,
  preview,
  createdAt: new Date().toISOString(),
});

export const prepareCancelReservationAction = async ({ reservationId, reservationNumber, user }) => {
  const reservation = await getReservationActionTarget({ reservationId, reservationNumber, user });
  if (['cancelled', 'finished', 'refunded'].includes(reservation.status)) {
    throw new Error(`Cannot cancel a ${reservation.status} reservation`);
  }

  return createPendingAction({
    actionType: 'cancelReservation',
    summary: `Cancel ${getReservationTitle(reservation)} from ${reservation.startDate} to ${reservation.endDate}.`,
    payload: { reservationId: reservation.id },
    preview: {
      reservationId: reservation.id,
      carName: getReservationTitle(reservation),
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      status: reservation.status,
      totalPrice: reservation.totalPrice,
    },
  });
};

export const prepareCreateReservationAction = async ({
  listingId,
  listingNumber,
  startDate,
  endDate,
  durationDays,
  pickupMethod,
  pickupAddress,
}) => {
  const listing = await getListingDetailsReadOnly({ listingId, listingNumber });
  const resolvedEndDate = durationDays ? addDaysYmd(startDate, Number(durationDays) - 1) : endDate;
  const estimate = await calculateReservationPriceReadOnly({
    listingId: listing.id,
    startDate,
    endDate: resolvedEndDate,
    pickupMethod: pickupMethod === 'renter_delivery' ? 'renter_delivery' : 'owner_place',
  });

  const carName = listing.car ? `${listing.car.brand || ''} ${listing.car.model || ''}`.trim() : listing.title;
  return createPendingAction({
    actionType: 'createReservation',
    summary: `Create a reservation for ${carName} from ${startDate} to ${resolvedEndDate}.`,
    payload: {
      listingId: listing.id,
      startDate,
      endDate: resolvedEndDate,
      pickupMethod,
      pickupAddress,
    },
    preview: {
      listingId: listing.id,
      carName,
      listingTitle: listing.title,
      city: listing.city,
      country: listing.country,
      startDate,
      endDate: resolvedEndDate,
      pickupMethod,
      pickupAddress,
      totalPrice: estimate.totalPrice,
      currency: estimate.currency,
    },
  });
};

export const prepareLeaveReviewAction = async ({ reservationId, reservationNumber, rating, comment, user }) => {
  const reservation = await getReservationActionTarget({ reservationId, reservationNumber, user });
  const reviewReservation = await getReservationForReview(reservation.id);

  if (reviewReservation.renter_id !== user.id) throw new Error('You can only review your own reservations');
  if (reviewReservation.status !== 'finished') throw new Error('You can only review reservations in finished status');

  const existingCount = await getReviewCountForReservationByReviewer({
    reservationId: reservation.id,
    reviewerId: user.id,
  });
  if (existingCount >= 5) throw new Error('You have reached the maximum of 5 reviews for this reservation');

  return createPendingAction({
    actionType: 'leaveReview',
    summary: `Leave a ${rating}/5 review for ${getReservationTitle(reservation)}.`,
    payload: {
      reservationId: reservation.id,
      rating,
      comment,
    },
    preview: {
      reservationId: reservation.id,
      carName: getReservationTitle(reservation),
      rating,
      comment,
    },
  });
};

export const prepareUpdateProfileAction = async ({ firstName, lastName, phone, userId }) => {
  const current = await getUserById(userId);
  if (!current) throw new Error('User not found');

  const changes = {};
  if (firstName !== undefined) changes.firstName = firstName;
  if (lastName !== undefined) changes.lastName = lastName;
  if (phone !== undefined) changes.phone = phone;

  return createPendingAction({
    actionType: 'updateProfile',
    summary: 'Update your Rentify profile information.',
    payload: changes,
    preview: {
      current: {
        firstName: current.first_name,
        lastName: current.last_name,
        phone: current.phone,
      },
      changes,
    },
  });
};

export const executeConfirmedAssistantAction = async ({ action, user }) => {
  if (!action?.actionType || !action?.payload) throw new Error('No pending action to confirm');

  if (action.actionType === 'cancelReservation') {
    const pending = await prepareCancelReservationAction({ reservationId: action.payload.reservationId, user });
    const result = await updateReservationStatus(pending.payload.reservationId, 'cancelled');
    return {
      type: 'actionResult',
      title: 'Reservation cancelled',
      actionType: action.actionType,
      status: 'completed',
      result,
    };
  }

  if (action.actionType === 'createReservation') {
    const result = await createReservationRecord(action.payload, user.id);
    return {
      type: 'actionResult',
      title: 'Reservation created',
      actionType: action.actionType,
      status: 'completed',
      result,
    };
  }

  if (action.actionType === 'leaveReview') {
    await prepareLeaveReviewAction({ ...action.payload, user });
    const result = await createReviewRecord({
      reservationId: action.payload.reservationId,
      reviewerId: user.id,
      rating: action.payload.rating,
      comment: action.payload.comment,
    });
    return {
      type: 'actionResult',
      title: 'Review submitted',
      actionType: action.actionType,
      status: 'completed',
      result,
    };
  }

  if (action.actionType === 'updateProfile') {
    const result = await updateUserById(user.id, action.payload);
    return {
      type: 'actionResult',
      title: 'Profile updated',
      actionType: action.actionType,
      status: 'completed',
      result,
    };
  }

  throw new Error(`Unsupported pending action: ${action.actionType}`);
};

export const getPaymentStatusReadOnly = async ({ reservationId, user }) => {
  const reservation = await getReservationDetailsReadOnly({ reservationId, user });
  const payment = await getPaymentByReservationId(reservationId);

  return {
    reservationId,
    reservationStatus: reservation.status,
    payment: payment ? {
      id: payment.id,
      amount: payment.amount,
      method: payment.paymentMethod,
      status: payment.status,
      escrowStatus: payment.escrowStatus,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    } : null,
  };
};

export const getFavoritesReadOnly = async (userId) => {
  const favorites = await getUserFavorites({ userId });
  return {
    count: favorites.items.length,
    items: favorites.items.slice(0, 8),
  };
};

export const getVehicleReviewsReadOnly = async ({ vehicleId, page, limit }) => {
  let carId = vehicleId;
  try {
    const listing = await getListingById(vehicleId);
    carId = listing.car?.id || listing.carId || vehicleId;
  } catch {
    // If vehicleId is already a car id, continue with it.
  }

  const [summary, items] = await Promise.all([
    getCarReviewSummary({ carId }),
    getReviewsByCarId({ carId, page, limit, sortBy: 'createdAt', sortOrder: 'desc' }),
  ]);

  return {
    carId,
    summary,
    items: items.map((review) => ({
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      reviewerName: review.reviewer
        ? `${review.reviewer.firstName || ''} ${review.reviewer.lastName || ''}`.trim()
        : null,
    })),
  };
};

export const getMyReviewsReadOnly = async ({ userId, page, limit }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('feedback')
    .select(
      'id, reservation_id, rating, comment, created_at, reservations(id, start_date, end_date, status, listings(id, title, city, country, cars(id, brand, model, year)))',
      { count: 'exact' }
    )
    .eq('reviewer_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    page,
    limit,
    total: count || 0,
    items: (data || []).map((review) => {
      const reservation = review.reservations || null;
      const listing = reservation?.listings || null;
      const car = listing?.cars || null;
      return {
        id: review.id,
        reservationId: review.reservation_id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        reservation: reservation ? {
          startDate: reservation.start_date,
          endDate: reservation.end_date,
          status: reservation.status,
        } : null,
        listing: listing ? {
          id: listing.id,
          title: listing.title,
          city: listing.city,
          country: listing.country,
        } : null,
        vehicle: car ? {
          id: car.id,
          brand: car.brand,
          model: car.model,
          year: car.year,
        } : null,
      };
    }),
  };
};

export const getUserProfileReadOnly = async (userId, role) => {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const [clientStats, ownerStats] = await Promise.all([
    getClientProfileStats({ userId }).catch(() => null),
    ['owner', 'agency', 'admin', 'companyManager'].includes(role)
      ? getOwnerProfileStats({ ownerId: userId }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    accountStatus: user.is_active ? 'active' : 'inactive',
    verificationStatus: user.is_verified ? 'verified' : 'not verified',
    stats: {
      client: clientStats,
      owner: ownerStats,
    },
  };
};

export const logAssistantMessage = async ({ conversationId, userId, role, content, metadata = {} }) => {
  if (String(process.env.ASSISTANT_ENABLE_DB_LOGGING || '').toLowerCase() !== 'true') {
    console.info('[assistant]', { conversationId, userId, role, metadata });
    return;
  }

  const { error: conversationError } = await supabase
    .from('assistant_conversations')
    .upsert({ id: conversationId, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (conversationError) throw conversationError;

  const { error } = await supabase.from('assistant_messages').insert([{
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
    metadata,
  }]);

  if (error) throw error;
};

export const logAssistantToolCall = async ({
  conversationId,
  userId,
  toolName,
  input,
  success,
  latencyMs,
  error = null,
}) => {
  if (String(process.env.ASSISTANT_ENABLE_TOOL_LOGGING || process.env.ASSISTANT_ENABLE_DB_LOGGING || '').toLowerCase() !== 'true') {
    console.info('[assistant:tool]', { conversationId, userId, toolName, success, latencyMs, error });
    return;
  }

  if (conversationId && userId) {
    const { error: conversationError } = await supabase
      .from('assistant_conversations')
      .upsert({ id: conversationId, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'id' });

    if (conversationError) throw conversationError;
  }

  const { error: insertError } = await supabase.from('assistant_tool_calls').insert([{
    conversation_id: conversationId,
    user_id: userId,
    tool_name: toolName,
    input,
    success,
    latency_ms: latencyMs,
    error,
  }]);

  if (insertError) throw insertError;
};
