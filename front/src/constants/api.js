const API_BASE_URL = process?.env?.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/api/auth/login`,
        REGISTER: `${API_BASE_URL}/api/auth/register`,
    },
    CARS: {
        LIST: `${API_BASE_URL}/api/cars`,
        GET: (id) => `${API_BASE_URL}/api/cars/${id}`,
        CREATE: `${API_BASE_URL}/api/cars`,
    },
    LISTINGS: {
        LIST: `${API_BASE_URL}/api/listings`,
        GET: (id) => `${API_BASE_URL}/api/listings/${id}`,
    },
    RESERVATIONS: {
        CREATE: `${API_BASE_URL}/api/reservations`,
        GET_USER: `${API_BASE_URL}/api/reservations/me`,
        GET: (id) => `${API_BASE_URL}/api/reservations/${id}`,
        UPDATE_DETAILS: (id) => `${API_BASE_URL}/api/reservations/${id}/details`,
        CANCEL: (id) => `${API_BASE_URL}/api/reservations/${id}/cancel`,
        GET_LISTING: (listingId) => `${API_BASE_URL}/api/reservations/listing/${listingId}`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/api/reservations/${id}/status`,
        GET_ALL: `${API_BASE_URL}/api/reservations`,
    },
};
