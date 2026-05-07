const API_BASE_URL = 'http://10.117.176.112:3000';

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
};