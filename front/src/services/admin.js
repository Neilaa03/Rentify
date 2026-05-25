import storage from '../utils/storage';
import { fetchJson } from './api';

const authHeaders = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

const tokenOrThrow = async () => {
  const token = await storage.getItemAsync('userToken');
  if (!token) throw new Error('Missing auth token');
  return token;
};

const q = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const adminApi = {
  dashboard: async () => {
    const token = await tokenOrThrow();
    return fetchJson('/api/admin/dashboard', { headers: authHeaders(token) });
  },
  users: async (params) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/users${q(params)}`, { headers: authHeaders(token) });
  },
  userDetails: async (userId) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/users/${userId}`, { headers: authHeaders(token) });
  },
  updateUser: async (userId, payload) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/users/${userId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(payload) });
  },
  cars: async (params) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/cars${q(params)}`, { headers: authHeaders(token) });
  },
  carDetails: async (carId) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/cars/${carId}`, { headers: authHeaders(token) });
  },
  updateCar: async (carId, payload) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/cars/${carId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(payload) });
  },
  reservations: async (params) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/reservations${q(params)}`, { headers: authHeaders(token) });
  },
  reservationDetails: async (reservationId) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/reservations/${reservationId}`, { headers: authHeaders(token) });
  },
  suspendReservation: async (reservationId, reason) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/reservations/${reservationId}/suspend`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ reason }) });
  },
  payments: async (params) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/payments${q(params)}`, { headers: authHeaders(token) });
  },
  refund: async (payload) => {
    const token = await tokenOrThrow();
    return fetchJson('/api/admin/payments/refund', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) });
  },
  reports: async (params) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/reports${q(params)}`, { headers: authHeaders(token) });
  },
  updateReport: async (reportId, status) => {
    const token = await tokenOrThrow();
    return fetchJson(`/api/admin/reports/${reportId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status }) });
  },
};
