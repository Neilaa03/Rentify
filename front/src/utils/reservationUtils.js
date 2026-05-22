import storage from './storage';
import { API_ENDPOINTS } from '../constants/api';

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
export const parseLocalDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'string') {
    const datePart = value.split('T')[0];
    const parts = datePart.split('-').map(Number);
    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
      const [year, month, day] = parts;
      return new Date(year, month - 1, day);
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Format date to YYYY-MM-DD string
 */
export const formatLocalYmd = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculate total days INCLUDING both start and end dates
 * Example: Aug 10 to Aug 30 = 21 days (not 20)
 */
export const calculateTotalDays = (startDateStr, endDateStr) => {
  const startDate = parseLocalDate(startDateStr);
  const endDate = parseLocalDate(endDateStr);
  
  if (!startDate || !endDate) return 0;
  
  // Add 1 to include both start and end date
  const totalDays = Math.ceil(
    (endDate - startDate) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  return totalDays;
};

/**
 * Calculate reservation price based on pricing tiers
 * INCLUDES both start and end dates in day count
 */
export const calculateReservationPrice = (listing, startDateStr, endDateStr, options = {}) => {
  const startDate = parseLocalDate(startDateStr);
  const endDate = parseLocalDate(endDateStr);
  
  if (!startDate || !endDate) return 0;
  
  // Total days INCLUDING both start and end date
  // Example: Aug 10 to Aug 12 = 3 days (10, 11, 12)
  const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;
  
  // Get pricing from listing (handle both snake_case and camelCase)
  const pricePerDay = parseFloat(listing.price_per_day || listing.pricePerDay || 0);
  const pricePerWeek = parseFloat(listing.price_per_week || listing.pricePerWeek || 0);
  const pricePerMonth = parseFloat(listing.price_per_month || listing.pricePerMonth || 0);
  
  let price = 0;
  let remainingDays = totalDays;
  
  // Apply monthly pricing first
  if (remainingDays >= 30 && pricePerMonth) {
    const fullMonths = Math.floor(remainingDays / 30);
    price += fullMonths * pricePerMonth;
    remainingDays -= fullMonths * 30;
  }
  
  // Apply weekly pricing
  if (remainingDays >= 7 && pricePerWeek) {
    const fullWeeks = Math.floor(remainingDays / 7);
    price += fullWeeks * pricePerWeek;
    remainingDays -= fullWeeks * 7;
  }
  
  // Apply daily pricing to remaining days
  price += remainingDays * pricePerDay;

  const extraDeliveryFee = Number(options?.deliveryFee || 0);
  if (Number.isFinite(extraDeliveryFee) && extraDeliveryFee > 0) {
    price += extraDeliveryFee;
  }

  return Math.max(0, price);
};

/**
 * Fetch listing availability data from backend
 * Returns: { availableFrom, availableTo, blockedDates: [YYYY-MM-DD, ...] }
 */
export const fetchListingAvailability = async (listingId) => {
  try {
    const token = await storage.getItemAsync('userToken');
    const endpointUrl = API_ENDPOINTS.RESERVATIONS.GET_CALENDAR_AVAILABILITY(listingId);
    
    console.log('Fetching calendar availability from:', endpointUrl);
    
    const response = await fetch(endpointUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch availability: ${response.status}`, {
        url: endpointUrl,
        listingId,
        status: response.status,
        statusText: response.statusText,
      });
      
      const errorText = await response.text();
      console.error('Response body:', errorText);
      
      // Return empty data if error
      return {
        availableFrom: null,
        availableTo: null,
        blockedDates: [],
      };
    }
    
    const data = await response.json();
    console.log('Availability fetched:', {
      availableFrom: data.availableFrom,
      availableTo: data.availableTo,
      blockedDatesCount: (data.blockedDates || []).length,
    });
    
    return {
      availableFrom: data.availableFrom,
      availableTo: data.availableTo,
      blockedDates: data.blockedDates || [],
    };
  } catch (error) {
    console.error('Error fetching availability:', error);
    return {
      availableFrom: null,
      availableTo: null,
      blockedDates: [],
    };
  }
};

/**
 * Fetch all reserved dates for a listing (excluding cancelled reservations)
 * DEPRECATED: Use fetchListingAvailability instead
 * Returns array of YYYY-MM-DD strings that are booked
 */
export const fetchReservedDates = async (listingId) => {
  try {
    const availability = await fetchListingAvailability(listingId);
    return availability.blockedDates;
  } catch (error) {
    console.error('Error fetching reserved dates:', error);
    console.warn('Proceeding without date blocking due to error');
    return [];
  }
};

/**
 * Get available date range from listing
 * Returns { from: YYYY-MM-DD, to: YYYY-MM-DD }
 */
export const getListingAvailabilityWindow = (listing) => {
  const from = listing?.available_from || listing?.availableFrom;
  const to = listing?.available_to || listing?.availableTo;
  
  return {
    from: formatLocalYmd(parseLocalDate(from)),
    to: formatLocalYmd(parseLocalDate(to)),
  };
};

/**
 * Check if a date is within listing's availability window
 */
export const isDateWithinAvailability = (dateStr, listing) => {
  const { from, to } = getListingAvailabilityWindow(listing);
  
  if (!from || !to) return true; // No availability restriction
  
  const date = parseLocalDate(dateStr);
  const fromDate = parseLocalDate(from);
  const toDate = parseLocalDate(to);
  
  return date >= fromDate && date <= toDate;
};

/**
 * Check if a date is reserved
 */
export const isDateReserved = (dateStr, reservedDates) => {
  return reservedDates.includes(dateStr);
};
