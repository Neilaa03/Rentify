import { fetchJson } from './api';

const authHeaders = (token, extra = {}) => ({
  ...extra,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const createReservation = async ({ token, payload }) => {
  return fetchJson('/api/reservations', {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload || {}),
  });
};

export const getMyReservations = async ({ token }) => {
  return fetchJson('/api/reservations/me', {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const getReservation = async ({ token, reservationId }) => {
  return fetchJson(`/api/reservations/${reservationId}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const updateReservationDetails = async ({ token, reservationId, payload }) => {
  return fetchJson(`/api/reservations/${reservationId}/details`, {
    method: 'PATCH',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload || {}),
  });
};

export const cancelReservation = async ({ token, reservationId }) => {
  return fetchJson(`/api/reservations/${reservationId}/cancel`, {
    method: 'POST',
    headers: authHeaders(token),
  });
};

export const confirmReservationPayment = async ({ token, reservationId }) => {
  return fetchJson(`/api/reservations/${reservationId}/confirm-payment`, {
    method: 'POST',
    headers: authHeaders(token),
  });
};

export const confirmReservationHandover = async ({ token, reservationId }) => {
  return fetchJson(`/api/reservations/${reservationId}/confirm-handover`, {
    method: 'POST',
    headers: authHeaders(token),
  });
};

export const disputeReservationHandover = async ({ token, reservationId, reason }) => {
  return fetchJson(`/api/reservations/${reservationId}/dispute`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  });
};

export const getListingReservations = async ({ token, listingId }) => {
  return fetchJson(`/api/reservations/listing/${listingId}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const getCalendarAvailability = async ({ token, listingId }) => {
  return fetchJson(`/api/reservations/calendar/availability/${listingId}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
};

export const updateReservationStatus = async ({ token, reservationId, payload }) => {
  return fetchJson(`/api/reservations/${reservationId}/status`, {
    method: 'PATCH',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload || {}),
  });
};
