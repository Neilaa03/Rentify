import {
  carDetailsSchema,
  assistantKnowledgeSearchSchema,
  cancelReservationActionSchema,
  createReservationActionSchema,
  leaveReviewActionSchema,
  listingDetailsSchema,
  listingAvailabilitySchema,
  myReviewsSchema,
  paymentStatusSchema,
  reservationDetailsSchema,
  reservationPriceSchema,
  searchVehicleFiltersSchema,
  updateProfileActionSchema,
  vehicleDetailsSchema,
  vehicleReviewsSchema,
} from './assistantSchemas.js';
import {
  calculateReservationPriceReadOnly,
  getCarDetailsReadOnly,
  getFavoritesReadOnly,
  getListingAvailabilityReadOnly,
  getListingDetailsReadOnly,
  getMyReviewsReadOnly,
  getPaymentStatusReadOnly,
  getReservationDetailsReadOnly,
  getReservationsForUser,
  searchAssistantKnowledgeReadOnly,
  getUserProfileReadOnly,
  getVehicleDetailsReadOnly,
  getVehicleReviewsReadOnly,
  prepareCancelReservationAction,
  prepareCreateReservationAction,
  prepareLeaveReviewAction,
  prepareUpdateProfileAction,
  searchVehiclesReadOnly,
} from './assistantModel.js';

export const assistantToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'searchAssistantKnowledge',
      description: 'Search embedded Rentify assistant knowledge such as rental policies, insurance terms, FAQs, vehicle information, terms and conditions, and support guidance. Use this for general policy or knowledge questions.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          categories: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['rental_policy', 'insurance_terms', 'faq', 'vehicle_information', 'terms_conditions', 'support'],
            },
          },
          limit: { type: 'integer' },
          threshold: { type: 'number' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getReservations',
      description: 'Read the authenticated user reservations as a list. Use only for list/all/latest reservation requests. For one numbered reservation, use getReservationDetails with reservationNumber. The userId is always taken from JWT context.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchVehicles',
      description: 'Search Rentify vehicle listings using read-only filters. Results include listing availability dates; use this for general listing/availability searches.',
      parameters: {
        type: 'object',
        properties: {
          country: { type: 'string' },
          city: { type: 'string' },
          availableFrom: { type: 'string', description: 'YYYY-MM-DD preferred' },
          availableTo: { type: 'string', description: 'YYYY-MM-DD preferred' },
          minPrice: { type: 'number' },
          maxPrice: { type: 'number' },
          fuelType: { type: 'string' },
          transmission: { type: 'string' },
          seats: { type: 'integer' },
          brand: { type: 'string' },
          year: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getVehicleDetails',
      description: 'Legacy alias: read full details for a vehicle listing by listing id. Prefer getListingDetails for listing details or getCarDetails for car-only details.',
      parameters: {
        type: 'object',
        properties: {
          vehicleId: { type: 'string', description: 'Rentify listing id' },
        },
        required: ['vehicleId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getListingDetails',
      description: 'Read full details for one listing. Use listingId when available from hidden numbered references. Use listingNumber when the user says "listing 1", "vehicle 2", or refers to numbered listing cards.',
      parameters: {
        type: 'object',
        properties: {
          listingId: { type: 'string', description: 'Rentify listing UUID, if known.' },
          listingNumber: { type: 'integer', description: '1-based number from the latest vehicle/listing cards shown to the user.' },
          filters: {
            type: 'object',
            description: 'Optional filters from the previous search if using listingNumber.',
            properties: {
              country: { type: 'string' },
              city: { type: 'string' },
              availableFrom: { type: 'string' },
              availableTo: { type: 'string' },
              minPrice: { type: 'number' },
              maxPrice: { type: 'number' },
              fuelType: { type: 'string' },
              transmission: { type: 'string' },
              seats: { type: 'integer' },
              brand: { type: 'string' },
              year: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCarDetails',
      description: 'Read car-specific details for one car. Use carId when available from hidden numbered references, or listingId/listingNumber when the user asks about the car inside a listing/vehicle card.',
      parameters: {
        type: 'object',
        properties: {
          carId: { type: 'string', description: 'Rentify car UUID, if known.' },
          listingId: { type: 'string', description: 'Listing UUID when the car is referenced through a listing.' },
          listingNumber: { type: 'integer', description: '1-based number from the latest vehicle/listing cards shown to the user.' },
          filters: {
            type: 'object',
            description: 'Optional filters from the previous search if using listingNumber.',
            properties: {
              country: { type: 'string' },
              city: { type: 'string' },
              availableFrom: { type: 'string' },
              availableTo: { type: 'string' },
              minPrice: { type: 'number' },
              maxPrice: { type: 'number' },
              fuelType: { type: 'string' },
              transmission: { type: 'string' },
              seats: { type: 'integer' },
              brand: { type: 'string' },
              year: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getUserProfile',
      description: 'Read the authenticated user profile. The userId is always taken from JWT context.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getReservationDetails',
      description: 'Read details for one reservation if the authenticated user is allowed to see it. Use reservationNumber when the user says "reservation 1", "the second reservation", or refers to the numbered reservation cards shown in the chat.',
      parameters: {
        type: 'object',
        properties: {
          reservationId: { type: 'string', description: 'Reservation UUID, if explicitly known.' },
          reservationNumber: { type: 'integer', description: '1-based number from the latest reservations list shown to the user.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getListingAvailability',
      description: 'Read a listing availability window and currently blocked reservation ranges. Use when the user asks when a specific listing/vehicle is available or rent-able.',
      parameters: {
        type: 'object',
        properties: {
          listingId: { type: 'string' },
        },
        required: ['listingId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculateReservationPrice',
      description: 'Calculate a read-only reservation price estimate. Does not create a reservation. Normalize natural dates first: "June 4th to 10th" means startDate YYYY-06-04 and endDate YYYY-06-10; "10 days starting June 4" means startDate YYYY-06-04 and durationDays 10.',
      parameters: {
        type: 'object',
        properties: {
          listingId: { type: 'string' },
          startDate: { type: 'string', description: 'YYYY-MM-DD' },
          endDate: { type: 'string', description: 'YYYY-MM-DD. Optional when durationDays is provided.' },
          durationDays: { type: 'integer', description: 'Exact requested rental duration in days, for example 10 for "10 days".' },
          pickupMethod: { type: 'string', enum: ['owner_place', 'renter_delivery'] },
        },
        required: ['listingId', 'startDate'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPaymentStatus',
      description: 'Read payment and escrow status for an allowed reservation.',
      parameters: {
        type: 'object',
        properties: {
          reservationId: { type: 'string' },
        },
        required: ['reservationId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getFavorites',
      description: 'Read the authenticated user active favorite listings.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getVehicleReviews',
      description: 'Read reviews and rating summary for a vehicle/listing.',
      parameters: {
        type: 'object',
        properties: {
          vehicleId: { type: 'string', description: 'Listing id or car id' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
        required: ['vehicleId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMyReviews',
      description: 'Read reviews left by the authenticated user, including rating, comment, reservation, listing, and vehicle context. Use when the user asks for my reviews or reviews I left.',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'requestCancelReservation',
      description: 'Prepare a cancellation for one of the authenticated user reservations. This does not cancel yet; it returns a pending action that requires explicit user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          reservationId: { type: 'string', description: 'Reservation UUID, if known from hidden references.' },
          reservationNumber: { type: 'integer', description: '1-based number from the latest reservation cards.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'requestCreateReservation',
      description: 'Prepare a new reservation for confirmation. This does not create a reservation yet. Use hidden listingId when available. Normalize natural dates first: "June 4th to 10th" means startDate YYYY-06-04 and endDate YYYY-06-10; "10 days starting June 4" means startDate YYYY-06-04 and durationDays 10.',
      parameters: {
        type: 'object',
        properties: {
          listingId: { type: 'string' },
          listingNumber: { type: 'integer' },
          startDate: { type: 'string', description: 'YYYY-MM-DD' },
          endDate: { type: 'string', description: 'YYYY-MM-DD. Optional when durationDays is provided.' },
          durationDays: { type: 'integer' },
          pickupMethod: { type: 'string', enum: ['owner_place', 'company_place', 'renter_delivery'] },
          pickupAddress: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'requestLeaveReview',
      description: 'Prepare a review for one completed reservation. This does not submit the review yet; it requires explicit user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          reservationId: { type: 'string' },
          reservationNumber: { type: 'integer' },
          rating: { type: 'integer', description: '1 to 5' },
          comment: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'requestUpdateProfile',
      description: 'Prepare an update to the authenticated user profile. This does not update yet; it requires explicit user confirmation. Only firstName, lastName, and phone are supported.',
      parameters: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
];

const parseToolArguments = (rawArguments) => {
  if (!rawArguments) return {};
  if (typeof rawArguments === 'object') return rawArguments;
  try {
    return JSON.parse(rawArguments);
  } catch (_error) {
    throw new Error('Invalid tool arguments');
  }
};

export const executeAssistantTool = async ({ name, rawArguments, user }) => {
  if (!user?.id) throw new Error('Authenticated user context is required');
  const args = parseToolArguments(rawArguments);

  switch (name) {
    case 'searchAssistantKnowledge':
      return searchAssistantKnowledgeReadOnly(assistantKnowledgeSearchSchema.parse(args));
    case 'getReservations':
      return getReservationsForUser(user.id);
    case 'getReservationDetails':
      return getReservationDetailsReadOnly({ ...reservationDetailsSchema.parse(args), user });
    case 'searchVehicles':
      return searchVehiclesReadOnly(searchVehicleFiltersSchema.parse(args));
    case 'getVehicleDetails':
      return getVehicleDetailsReadOnly(vehicleDetailsSchema.parse(args).vehicleId);
    case 'getListingDetails':
      return getListingDetailsReadOnly(listingDetailsSchema.parse(args));
    case 'getCarDetails':
      return getCarDetailsReadOnly(carDetailsSchema.parse(args));
    case 'getUserProfile':
      return getUserProfileReadOnly(user.id, user.role);
    case 'getListingAvailability':
      return getListingAvailabilityReadOnly(listingAvailabilitySchema.parse(args).listingId);
    case 'calculateReservationPrice':
      return calculateReservationPriceReadOnly(reservationPriceSchema.parse(args));
    case 'getPaymentStatus':
      return getPaymentStatusReadOnly({
        reservationId: paymentStatusSchema.parse(args).reservationId,
        user,
      });
    case 'getFavorites':
      return getFavoritesReadOnly(user.id);
    case 'getVehicleReviews':
      return getVehicleReviewsReadOnly(vehicleReviewsSchema.parse(args));
    case 'getMyReviews':
      return getMyReviewsReadOnly({ userId: user.id, ...myReviewsSchema.parse(args) });
    case 'requestCancelReservation':
      return prepareCancelReservationAction({ ...cancelReservationActionSchema.parse(args), user });
    case 'requestCreateReservation':
      return prepareCreateReservationAction({ ...createReservationActionSchema.parse(args), user });
    case 'requestLeaveReview':
      return prepareLeaveReviewAction({ ...leaveReviewActionSchema.parse(args), user });
    case 'requestUpdateProfile':
      return prepareUpdateProfileAction({ ...updateProfileActionSchema.parse(args), userId: user.id });
    default:
      throw new Error(`Unsupported assistant tool: ${name}`);
  }
};
