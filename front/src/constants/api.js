const API_BASE_URL = process?.env?.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/api/auth/login`,
        REGISTER: `${API_BASE_URL}/api/auth/register`,
        GOOGLE: `${API_BASE_URL}/api/auth/google`,
        ME: `${API_BASE_URL}/api/auth/me`,
        SET_PASSWORD: `${API_BASE_URL}/api/auth/set-password`,
        VERIFY_EMAIL: `${API_BASE_URL}/api/auth/verify-email`,
        RESEND_VERIFICATION: `${API_BASE_URL}/api/auth/resend-verification`,
        FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
        RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`,
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
        CONFIRM_PAYMENT: (id) => `${API_BASE_URL}/api/reservations/${id}/confirm-payment`,
        CONFIRM_HANDOVER: (id) => `${API_BASE_URL}/api/reservations/${id}/confirm-handover`,
        DISPUTE: (id) => `${API_BASE_URL}/api/reservations/${id}/dispute`,
        GET_LISTING: (listingId) => `${API_BASE_URL}/api/reservations/listing/${listingId}`,
        GET_CALENDAR_AVAILABILITY: (listingId) => `${API_BASE_URL}/api/reservations/calendar/availability/${listingId}`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/api/reservations/${id}/status`,
        GET_ALL: `${API_BASE_URL}/api/reservations`,
        PICKUP: {
            GENERATE: (id) => `${API_BASE_URL}/api/reservations/${id}/pickup/generate`,
            PAYLOAD: (id) => `${API_BASE_URL}/api/reservations/${id}/pickup/payload`,
            VERIFY: (id) => `${API_BASE_URL}/api/reservations/${id}/pickup/verify`,
        },
        RETURN: {
            GENERATE: (id) => `${API_BASE_URL}/api/reservations/${id}/return/generate`,
            PAYLOAD: (id) => `${API_BASE_URL}/api/reservations/${id}/return/payload`,
            VERIFY: (id) => `${API_BASE_URL}/api/reservations/${id}/return/verify`,
        },
    },
    NOTIFICATIONS: {
        LIST: `${API_BASE_URL}/api/notifications`,
        UNREAD_COUNT: `${API_BASE_URL}/api/notifications/unread-count`,
        MARK_AS_READ: (id) => `${API_BASE_URL}/api/notifications/${id}/read`,
        MARK_ALL_AS_READ: `${API_BASE_URL}/api/notifications/read-all`,
    },
    PAYMENTS: {
        CREATE_CARD_PAYMENT: `${API_BASE_URL}/api/payments/create-card-payment`,
        CREATE_CASH_PAYMENT: `${API_BASE_URL}/api/payments/create-cash-payment`,
        CONFIRM_CASH_PAYMENT: `${API_BASE_URL}/api/payments/confirm-cash-payment`,
        GET_STATUS: (reservationId) => `${API_BASE_URL}/api/payments/status/${reservationId}`,
        CONNECT_ONBOARDING_LINK: `${API_BASE_URL}/api/payments/connect/onboarding-link`,
        CONNECT_STATUS: (ownerId) => `${API_BASE_URL}/api/payments/connect/status/${ownerId}`,
        WEBHOOK: `${API_BASE_URL}/api/payments/webhook`,
    },
    REVIEWS: {
        CAR_LIST: (carId) => `${API_BASE_URL}/api/reviews/cars/${carId}`,
        CAR_SUMMARY: (carId) => `${API_BASE_URL}/api/reviews/cars/${carId}/summary`,
        RESERVATION_GET: (reservationId) => `${API_BASE_URL}/api/reviews/reservations/${reservationId}`,
        RESERVATION_CREATE: (reservationId) => `${API_BASE_URL}/api/reviews/reservations/${reservationId}`,
    },
};
