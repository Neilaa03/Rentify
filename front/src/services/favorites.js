import { fetchJson } from './api';

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

export const getFavorites = async ({ token }) => {
  return fetchJson('/api/favorites', { headers: authHeaders(token) });
};

export const addFavorite = async ({ token, listingId }) => {
  return fetchJson(`/api/favorites/${listingId}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
};

export const removeFavorite = async ({ token, listingId }) => {
  return fetchJson(`/api/favorites/${listingId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
};

