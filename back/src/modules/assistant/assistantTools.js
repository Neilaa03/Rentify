import { searchVehicleFiltersSchema, vehicleDetailsSchema } from './assistantSchemas.js';
import {
  getReservationsForUser,
  getUserProfileReadOnly,
  getVehicleDetailsReadOnly,
  searchVehiclesReadOnly,
} from './assistantRepository.js';

export const assistantToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'getReservations',
      description: 'Read the authenticated user reservations. The userId is always taken from JWT context.',
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
      description: 'Search active Rentify vehicle listings using read-only filters.',
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
      description: 'Read full details for a vehicle listing by listing id.',
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
      name: 'getUserProfile',
      description: 'Read the authenticated user profile. The userId is always taken from JWT context.',
      parameters: {
        type: 'object',
        properties: {},
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
    case 'getReservations':
      return getReservationsForUser(user.id);
    case 'searchVehicles':
      return searchVehiclesReadOnly(searchVehicleFiltersSchema.parse(args));
    case 'getVehicleDetails':
      return getVehicleDetailsReadOnly(vehicleDetailsSchema.parse(args).vehicleId);
    case 'getUserProfile':
      return getUserProfileReadOnly(user.id, user.role);
    default:
      throw new Error(`Unsupported assistant tool: ${name}`);
  }
};
