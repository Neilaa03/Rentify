const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';


export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/auth/login`,
        REGISTER: `${API_BASE_URL}/auth/register`,
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