import OpenAI from 'openai';
import { FunctionCallingConfigMode, GoogleGenAI, Type } from '@google/genai';
import { assistantToolDefinitions, executeAssistantTool } from './assistantTools.js';
import {
  createConversationId,
  executeConfirmedAssistantAction,
  logAssistantMessage,
  logAssistantToolCall,
} from './assistantModel.js';

const model = process.env.OPENAI_MODEL || 'gpt-5';
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const assistantProvider = String(process.env.ASSISTANT_PROVIDER || 'openai').toLowerCase();
const maxContextMessages = Number(process.env.ASSISTANT_MAX_CONTEXT_MESSAGES || 12);
const maxToolRounds = Number(process.env.ASSISTANT_MAX_TOOL_ROUNDS || 3);

const assistantSystemPrompt = `
You are Rentify AI Concierge for a car rental marketplace.
Use searchAssistantKnowledge for questions about Rentify rental policies, insurance terms, FAQs, vehicle information, terms and conditions, support guidance, or other assistant knowledge.
Use tools when you need live Rentify data about reservations, vehicles, listings, or the authenticated user.
Never claim you performed a booking, cancellation, payment, profile edit, upload, approval, or any other write action unless the backend returned a completed action result.
For write actions, call the request action tools first and ask the user to confirm. The action is executed only after the user replies yes/confirm.
Only use data returned by tools for account-specific claims.
Keep answers practical, concise, and friendly.
Use hidden numbered references from conversation context when available; do not reveal internal ids to the user.
When showing profile data, never mention ids, image URLs, raw timestamps, or internal fields.
When showing reservations or vehicles, summarize the most useful fields in short grouped bullets.
When showing listings or vehicle search results, always include each listing availability window (availableFrom to availableTo) when the tool data contains it.
When the user asks about listing availability, dates, or when a vehicle can be rented, use getListingAvailability for a specific listing and searchVehicles for general listing searches.
When a user asks for one specific reservation by number, such as "reservation 2" or "the second one", call getReservationDetails with reservationNumber instead of getReservations.
When a user asks for one specific listing or numbered vehicle card, call getListingDetails. When they ask for car specs/details, call getCarDetails.
If a user says "it" or asks for a price without a clear vehicle/listing id from context, ask which numbered vehicle they mean instead of searching and showing unrelated vehicles.
For rental price estimates, rental dates are inclusive. If a user asks for N days starting on a date, call calculateReservationPrice with durationDays=N and do not invent an endDate.
For natural rental dates, normalize phrases like "June 4th to 10th", "from June 4 to June 10", and "10 days starting June 4" into YYYY-MM-DD tool arguments.
If the user gives a month/day without a year, assume the current calendar year.
`.trim();

const normalizeContext = (context = []) => (
  context
    .filter((message) => ['user', 'assistant'].includes(message.role) && message.content)
    .slice(-maxContextMessages)
    .map((message) => ({ role: message.role, content: message.content }))
);

const parseResponseText = (completion) => (
  completion.choices?.[0]?.message?.content?.trim?.() || ''
);

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  return new GoogleGenAI({ apiKey });
};

const buildInitialMessages = ({ context, message, user }) => [
  { role: 'system', content: assistantSystemPrompt },
  {
    role: 'system',
    content: `Authenticated Rentify user context: id=${user.id}; role=${user.role || 'unknown'}. Tool calls must use this user context automatically.`,
  },
  ...normalizeContext(context),
  { role: 'user', content: message },
];

const compactListing = (listing) => {
  const carName = listing.car
    ? `${listing.car.brand || ''} ${listing.car.model || ''}`.trim()
    : '';

  return {
    id: listing.id,
    listingTitle: listing.title,
    carName: carName || listing.title || 'Vehicle',
    city: listing.city,
    country: listing.country,
    pricePerDay: listing.pricePerDay,
    availableFrom: listing.availableFrom,
    availableTo: listing.availableTo,
    car: listing.car ? {
      id: listing.car.id,
      brand: listing.car.brand,
      model: listing.car.model,
      year: listing.car.year,
      transmission: listing.car.transmission,
      fuelType: listing.car.fuelType,
      seats: listing.car.seats,
      image: listing.car.images?.[0]?.imageUrl || null,
    } : null,
  };
};

const createToolResultPreview = ({ name, data }) => {
  if (data?.status === 'pending_confirmation' && data?.requiresConfirmation) {
    return {
      type: 'pendingAction',
      title: 'Confirm action',
      action: data,
    };
  }

  if (data?.type === 'actionResult') {
    return data;
  }

  if (name === 'getReservations') {
    return {
      type: 'reservations',
      title: 'Reservations',
      items: (data || []).slice(0, 5).map((item) => ({
        id: item.id,
        listingId: item.listingId,
        carId: item.listing?.car?.id,
        title: item.listing?.title || `${item.listing?.car?.brand || ''} ${item.listing?.car?.model || ''}`.trim(),
        city: item.listing?.city,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.status,
        totalPrice: item.totalPrice,
      })),
    };
  }

  if (name === 'searchAssistantKnowledge') {
    return {
      type: 'assistantKnowledge',
      title: 'Assistant knowledge',
      items: (data.items || []).slice(0, 5).map((item) => ({
        category: item.category,
        title: item.title,
        content: item.content,
        similarity: item.similarity,
      })),
    };
  }

  if (name === 'getVehicleDetails' || name === 'getListingDetails') {
    return {
      type: 'listing',
      title: data.referenceNumber ? `Listing ${data.referenceNumber}` : 'Listing details',
      listing: compactListing(data),
      details: {
        description: data.description,
        availableFrom: data.availableFrom,
        availableTo: data.availableTo,
        pricePerWeek: data.pricePerWeek,
        pricePerMonth: data.pricePerMonth,
        pickupAddress: data.pickupAddress,
        deliveryFee: data.deliveryFee,
        isActive: data.isActive,
      },
    };
  }

  if (name === 'getCarDetails') {
    return {
      type: 'car',
      title: data.referenceNumber ? `Car ${data.referenceNumber}` : 'Car details',
      car: {
        id: data.id,
        name: `${data.brand || ''} ${data.model || ''}`.trim() || 'Car',
        brand: data.brand,
        model: data.model,
        year: data.year,
        color: data.color,
        fuelType: data.fuelType,
        transmission: data.transmission,
        mileage: data.mileage,
        seats: data.seats,
        description: data.description,
        listing: data.listing,
      },
    };
  }

  if (name === 'getReservationDetails') {
    const car = data.listing?.car;
    const carName = car ? `${car.brand || ''} ${car.model || ''}`.trim() : data.listing?.title || 'Vehicle';
    return {
      type: 'reservation',
      title: data.referenceNumber ? `Reservation ${data.referenceNumber}` : 'Reservation details',
      reservation: {
        id: data.id,
        title: data.listing?.title || carName,
        carName,
        city: data.listing?.city,
        country: data.listing?.country,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        totalPrice: data.totalPrice,
        createdAt: data.createdAt,
        pickup: data.pickup,
        vehicle: car ? {
          year: car.year,
          seats: car.seats,
          transmission: car.transmission,
          fuelType: car.fuelType,
        } : null,
        pricePerDay: data.listing?.pricePerDay,
      },
    };
  }

  if (name === 'searchVehicles') {
    return {
      type: 'vehicles',
      title: 'Listings',
      items: (data.items || []).slice(0, 5).map(compactListing),
    };
  }

  if (name === 'getFavorites') {
    return {
      type: 'vehicles',
      title: 'Favorite listings',
      items: (data.items || []).slice(0, 5).map(compactListing),
    };
  }

  if (name === 'getUserProfile') {
    return {
      type: 'profile',
      title: 'Profile',
      profile: {
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: data.email,
        phone: data.phone,
        role: data.role,
        accountStatus: data.accountStatus,
        verificationStatus: data.verificationStatus,
        reservations: data.stats?.client?.reservations,
        favorites: data.stats?.client?.favorites,
        reviews: data.stats?.client?.reviews,
      },
    };
  }

  if (name === 'calculateReservationPrice') {
    return {
      type: 'price',
      title: 'Price estimate',
      estimate: data,
    };
  }

  if (name === 'getPaymentStatus') {
    return {
      type: 'payment',
      title: 'Payment status',
      payment: data,
    };
  }

  if (name === 'getListingAvailability') {
    return {
      type: 'availability',
      title: 'Availability',
      availability: data,
    };
  }

  if (name === 'getVehicleReviews') {
    return {
      type: 'reviews',
      title: 'Reviews',
      reviews: data,
    };
  }

  if (name === 'getMyReviews') {
    return {
      type: 'myReviews',
      title: 'Reviews you left',
      reviews: data,
    };
  }

  return {
    type: 'raw',
    title: name,
    data,
  };
};

const selectDisplayToolResults = (results = []) => {
  const priorityTypes = ['actionResult', 'pendingAction', 'assistantKnowledge', 'price', 'payment', 'reservation', 'listing', 'car', 'profile', 'myReviews', 'reservations', 'availability', 'reviews'];
  const firstPriority = priorityTypes.find((type) => results.some((result) => result.type === type));

  if (firstPriority) {
    return results.filter((result) => result.type === firstPriority);
  }

  return results;
};

const ordinalWords = {
  first: 1,
  '1st': 1,
  second: 2,
  '2nd': 2,
  third: 3,
  '3rd': 3,
  fourth: 4,
  '4th': 4,
  fifth: 5,
  '5th': 5,
};

const getOrdinalNumber = (text) => Object.entries(ordinalWords).find(([word]) => text.includes(word))?.[1];

const monthNumbers = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const stripOrdinalSuffix = (value) => String(value || '').replace(/(\d+)(st|nd|rd|th)\b/gi, '$1');
const padDatePart = (value) => String(value).padStart(2, '0');
const toYmd = ({ year, month, day }) => `${year}-${padDatePart(month)}-${padDatePart(day)}`;

const isValidYmdParts = ({ year, month, day }) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const getDefaultRentalYear = () => new Date().getFullYear();

const buildYmdIfValid = ({ year = getDefaultRentalYear(), month, day }) => {
  const parts = { year: Number(year), month: Number(month), day: Number(day) };
  if (!isValidYmdParts(parts)) return null;
  return toYmd(parts);
};

const parseNaturalDate = (rawText, fallbackMonth) => {
  const text = stripOrdinalSuffix(rawText).trim().toLowerCase();

  const isoMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return buildYmdIfValid({ year: isoMatch[1], month: isoMatch[2], day: isoMatch[3] });
  }

  const monthDayMatch = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:\s*,?\s*(20\d{2}))?\b/i);
  if (monthDayMatch) {
    const month = monthNumbers[monthDayMatch[1].toLowerCase()];
    return buildYmdIfValid({ year: monthDayMatch[3] || getDefaultRentalYear(), month, day: monthDayMatch[2] });
  }

  const dayMonthMatch = text.match(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s*,?\s*(20\d{2}))?\b/i);
  if (dayMonthMatch) {
    const month = monthNumbers[dayMonthMatch[2].toLowerCase()];
    return buildYmdIfValid({ year: dayMonthMatch[3] || getDefaultRentalYear(), month, day: dayMonthMatch[1] });
  }

  const dayOnlyMatch = text.match(/^\d{1,2}$/);
  if (dayOnlyMatch && fallbackMonth) {
    return buildYmdIfValid({ month: fallbackMonth, day: dayOnlyMatch[0] });
  }

  return null;
};

const getMonthFromYmd = (ymd) => Number(String(ymd || '').slice(5, 7)) || undefined;

const parseNaturalRentalDates = (message) => {
  const text = stripOrdinalSuffix(String(message || '').toLowerCase());

  const durationMatch = text.match(/\b(\d{1,3})\s*(?:days?|jours?)\b/);
  const startFromMatch = text.match(/\b(?:starting|start|from|beginning|begin)\s+(?:on\s+|from\s+)?((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))[^,.;]*)/i);
  if (durationMatch && startFromMatch) {
    const startDate = parseNaturalDate(startFromMatch[1]);
    if (startDate) {
      return {
        startDate,
        durationDays: Number(durationMatch[1]),
      };
    }
  }

  const fromForDurationMatch = text.match(/\b(?:from|starting)\s+(.+?)\s+(?:for|during)\s+(\d{1,3})\s*(?:days?|jours?)\b/i);
  if (fromForDurationMatch) {
    const startDate = parseNaturalDate(fromForDurationMatch[1]);
    if (startDate) {
      return {
        startDate,
        durationDays: Number(fromForDurationMatch[2]),
      };
    }
  }

  const singleStartMatch = text.match(/\b(?:starting|start|from|beginning|begin)\s+(?:on\s+|for\s+|from\s+)?((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))[^,.;]*)/i);
  const singleStartDate = singleStartMatch ? parseNaturalDate(singleStartMatch[1]) : null;

  const datePhrase = '(?:\\d{4}-\\d{1,2}-\\d{1,2}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\s+\\d{1,2}|\\d{1,2}\\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))';
  const rangePatterns = [
    new RegExp(`\\bfrom\\s+(.+?)\\s+(?:to|until|through|-|→)\\s+(.+?)(?:\\s|$|[,.!?])`, 'i'),
    new RegExp(`\\b(${datePhrase}[^,.;!?]*?)\\s+(?:to|until|through|-|→)\\s+(.+?)(?:\\s|$|[,.!?])`, 'i'),
  ];

  for (const pattern of rangePatterns) {
    const rangeMatch = text.match(pattern);
    if (rangeMatch) {
      const startDate = parseNaturalDate(rangeMatch[1]);
      const fallbackMonth = getMonthFromYmd(startDate);
      const endDate = parseNaturalDate(rangeMatch[2], fallbackMonth);
      if (startDate && endDate) return { startDate, endDate };
    }
  }

  if (singleStartDate) return { startDate: singleStartDate };

  return null;
};

const parseHiddenVehicleReferences = (context = []) => {
  const refs = new Map();
  const hiddenText = context.map((message) => message.content || '').join('\n');
  const pattern = /(?:Vehicle|Listing)\s+(\d+):\s+listingId=([^;\n]*);\s+carId=([^;\n]*);/gi;
  let match = pattern.exec(hiddenText);

  while (match) {
    refs.set(Number(match[1]), {
      listingId: match[2]?.trim() || undefined,
      carId: match[3]?.trim() || undefined,
    });
    match = pattern.exec(hiddenText);
  }

  return refs;
};

const parseLatestListingReference = (context = []) => {
  const hiddenText = context.map((message) => message.content || '').join('\n');
  const patterns = [
    /Current listing:\s+listingId=([^;\n]*);\s+carId=([^;\n]*);/gi,
    /(?:Vehicle|Listing)\s+\d+:\s+listingId=([^;\n]*);\s+carId=([^;\n]*);/gi,
  ];
  let latest = null;

  patterns.forEach((pattern) => {
    let match = pattern.exec(hiddenText);
    while (match) {
      latest = {
        listingId: match[1]?.trim() || undefined,
        carId: match[2]?.trim() || undefined,
      };
      match = pattern.exec(hiddenText);
    }
  });

  return latest;
};

const parseLatestEstimateReference = (context = []) => {
  const hiddenText = context.map((message) => message.content || '').join('\n');
  const pattern = /Current estimate:\s+listingId=([^;\n]*);\s+title=([^;\n]*);\s+startDate=([^;\n]*);\s+endDate=([^;\n]*);\s+durationDays=([^;\n]*);/gi;
  let latest = null;
  let match = pattern.exec(hiddenText);

  while (match) {
    latest = {
      listingId: match[1]?.trim() || undefined,
      title: match[2]?.trim() || undefined,
      startDate: match[3]?.trim() || undefined,
      endDate: match[4]?.trim() || undefined,
      durationDays: Number(match[5]) || undefined,
    };
    match = pattern.exec(hiddenText);
  }

  return latest;
};

const resolveDirectDetailTool = ({ message, context }) => {
  const text = String(message || '').toLowerCase();
  const carMatch = text.match(/\bcar\s+(?:number\s+)?(\d+)\b|(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\s+car\b/);
  const listingMatch = text.match(/\blisting\s+(?:number\s+)?(\d+)\b|(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\s+listing\b/);
  const vehicleMatch = text.match(/\bvehicle\s+(?:number\s+)?(\d+)\b|(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\s+vehicle\b/);
  const wantsAvailability = /\b(availab|available|availability|date|dates|when|rental period|calendar)\b/.test(text);
  if (wantsAvailability && /\b(it|this|that|listing|vehicle|car)\b/.test(text)) {
    const latestRef = parseLatestListingReference(context);
    if (latestRef?.listingId && !/\b(?:car|listing|vehicle)\s+(?:number\s+)?\d+\b/.test(text)) {
      return { name: 'getListingAvailability', args: { listingId: latestRef.listingId } };
    }
  }

  const number = Number(carMatch?.[1] || listingMatch?.[1] || vehicleMatch?.[1] || getOrdinalNumber(text));
  if (!number) return null;

  const ref = parseHiddenVehicleReferences(context).get(number);
  if (!ref?.listingId && !ref?.carId) return null;

  if (wantsAvailability && ref.listingId) {
    return { name: 'getListingAvailability', args: { listingId: ref.listingId } };
  }

  const wantsCar = Boolean(carMatch) || (Boolean(vehicleMatch) && /\b(car|specs?|technical|transmission|fuel|seats|mileage)\b/.test(text));
  if (wantsCar) {
    return { name: 'getCarDetails', args: ref.carId ? { carId: ref.carId } : { listingId: ref.listingId } };
  }

  return { name: 'getListingDetails', args: { listingId: ref.listingId } };
};

const resolveListingReferenceForRental = ({ message, context }) => {
  const text = String(message || '').toLowerCase();
  const listingMatch = text.match(/\b(?:listing|vehicle)\s+(?:number\s+)?(\d+)\b|(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\s+(?:listing|vehicle)\b/);
  const number = Number(listingMatch?.[1] || getOrdinalNumber(text));
  if (number) {
    const ref = parseHiddenVehicleReferences(context).get(number);
    if (ref?.listingId) return ref;
  }

  return parseLatestEstimateReference(context) || parseLatestListingReference(context);
};

const resolveDirectRentalTool = ({ message, context }) => {
  const text = String(message || '').toLowerCase();
  const dates = parseNaturalRentalDates(message);
  if (!dates?.startDate) return null;

  const ref = resolveListingReferenceForRental({ message, context });
  if (!ref?.listingId) return null;

  const wantsPrice = /\b(cost|price|how much|estimate|total|quote)\b/.test(text);
  const wantsReservation = /\b(rent|book|reserve|reservation|hire)\b/.test(text);
  if (!wantsPrice && !wantsReservation) return null;

  const args = {
    listingId: ref.listingId,
    startDate: dates.startDate,
    ...(dates.durationDays
      ? { durationDays: dates.durationDays }
      : dates.endDate
        ? { endDate: dates.endDate }
        : ref.durationDays
          ? { durationDays: ref.durationDays }
          : {}),
  };

  if (!args.endDate && !args.durationDays) return null;

  return {
    name: wantsPrice ? 'calculateReservationPrice' : 'requestCreateReservation',
    args,
  };
};

const resolveDirectKnowledgeTool = ({ message }) => {
  const text = String(message || '').toLowerCase();
  const categoryChecks = [
    { category: 'faq', query: 'faq', pattern: /\b(faq|frequently asked|question|questions|help)\b/ },
    { category: 'rental_policy', query: 'rental policy booking pickup return cancellation refund', pattern: /\b(policy|policies|polici\w*|rental rules?|booking rules?|pickup|return|cancel|cancellation|refund)\b/ },
    { category: 'insurance_terms', query: 'insurance terms coverage damage claims disputes', pattern: /\b(insurance|coverage|damage|claim|claims|dispute|deductible)\b/ },
    { category: 'terms_conditions', query: 'terms and conditions user conduct platform safety', pattern: /\b(terms|conditions|conduct|rules|safety)\b/ },
    { category: 'support', query: 'support contact admin help', pattern: /\b(support|contact|admin|help center)\b/ },
  ];

  const matched = categoryChecks.find((item) => item.pattern.test(text));
  if (!matched) return null;

  return {
    name: 'searchAssistantKnowledge',
    args: {
      query: text.trim().length <= 24 ? matched.query : message,
      categories: [matched.category],
      limit: matched.category === 'faq' && text.trim().length <= 12 ? 5 : 3,
      threshold: 0.45,
    },
  };
};

const getKnowledgeIntro = ({ category, message }) => {
  const text = String(message || '').trim();
  const intros = {
    faq: text.length <= 12
      ? 'Here are the main FAQ entries available in Rentify.'
      : 'These FAQ entries best match your question.',
    rental_policy: 'These are the Rentify rental policy details that match your question.',
    insurance_terms: 'These are the insurance terms and responsibilities that apply.',
    terms_conditions: 'These are the relevant Rentify terms and conditions.',
    support: 'This is the support guidance that matches your request.',
    vehicle_information: 'These vehicle information notes match your question.',
  };

  return intros[category] || 'This is the relevant Rentify knowledge for your question.';
};

const isConfirmationMessage = (message) => /^(yes|yep|yeah|confirm|confirmed|ok|okay|do it|proceed|go ahead)(\b|$)/i.test(String(message || '').trim());
const isRejectionMessage = (message) => /^(no|nope|cancel|stop|never mind|nevermind)(\b|$)/i.test(String(message || '').trim());
const isClientVerificationRequired = (error) => String(error?.message || '').includes('CLIENT_VERIFICATION_REQUIRED');

const getAssistantFriendlyError = (error) => {
  if (isClientVerificationRequired(error)) {
    return 'Before you can create a reservation, your driver license must be uploaded and approved. Please upload your driver license from your documents/profile section, then try booking again once it is approved.';
  }

  return error?.message || 'That action could not be completed.';
};

const getLatestPendingAction = (context = []) => {
  const text = context.map((message) => message.content || '').join('\n');
  const matches = [...text.matchAll(/Hidden pending action:\s*(\{[^\n]+\})/g)];
  const latestMatch = matches[matches.length - 1];
  const latest = latestMatch?.[1];
  if (!latest) return null;

  const latestClearIndex = text.lastIndexOf('Hidden pending action cleared');
  if (latestClearIndex > latestMatch.index) return null;

  try {
    const parsed = JSON.parse(latest);
    return parsed?.status === 'pending_confirmation' ? parsed : null;
  } catch {
    return null;
  }
};

const runSingleToolResponse = async ({ user, message, conversationId, tool, answer }) => {
  const id = conversationId || createConversationId();

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'user',
    content: message,
    metadata: { source: 'assistant_chat', provider: assistantProvider, directTool: tool.name },
  }).catch((error) => console.error('[assistant] failed to log user message', error.message));

  let toolResult;
  try {
    toolResult = await executeAuditedTool({
      name: tool.name,
      rawArguments: tool.args,
      user,
      conversationId: id,
    });
  } catch (error) {
    if (!isClientVerificationRequired(error)) throw error;

    const content = getAssistantFriendlyError(error);
    await logAssistantMessage({
      conversationId: id,
      userId: user.id,
      role: 'assistant',
      content,
      metadata: {
        provider: assistantProvider,
        directTool: tool.name,
        actionStatus: 'failed',
        error: error.message || 'Action failed',
      },
    }).catch((logError) => console.error('[assistant] failed to log assistant message', logError.message));

    return {
      conversationId: id,
      message: {
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
      },
      toolsUsed: [tool.name],
      toolResults: [{
        type: 'actionResult',
        title: 'Action failed',
        actionType: 'createReservation',
        status: 'failed',
        result: {
          error: error.message || 'Action failed',
          reason: 'driver_license_required',
        },
      }],
    };
  }

  let content = answer || 'Here are the details I found.';
  if (tool.name === 'getListingAvailability') {
    const data = toolResult.data || {};
    const blocked = (data.blockedRanges || [])
      .slice(0, 3)
      .map((range) => `${range.startDate} to ${range.endDate}`)
      .join('; ');
    content = `${data.title || 'This listing'} is available from ${data.availableFrom || 'not set'} to ${data.availableTo || 'not set'}${blocked ? `. Blocked ranges: ${blocked}.` : '. No blocked reservation ranges were found.'}`;
  } else if (tool.name === 'calculateReservationPrice') {
    const data = toolResult.data || {};
    content = `The estimate for ${data.title || 'this listing'} from ${data.startDate} to ${data.endDate} is ${data.totalPrice} ${data.currency || 'DA'} for ${data.totalDays} day(s). This is only an estimate; no reservation was created.`;
  } else if (tool.name === 'requestCreateReservation') {
    const data = toolResult.data || {};
    content = `${data.summary || 'I prepared the reservation.'} Reply yes to confirm, or no to cancel. After creation, payment must be completed within 24 hours or the reservation will be cancelled automatically.`;
  } else if (tool.name === 'getListingDetails' || tool.name === 'getVehicleDetails') {
    const data = toolResult.data || {};
    const car = data.car;
    const carName = car ? `${car.brand || ''} ${car.model || ''}`.trim() : data.title || 'vehicle';
    content = `${data.title || 'Listing'} for ${carName}: ${data.city || 'unknown city'}, ${data.pricePerDay || 'price not set'} per day, available from ${data.availableFrom || 'not set'} to ${data.availableTo || 'not set'}.`;
  } else if (tool.name === 'searchAssistantKnowledge') {
    const items = toolResult.data?.items || [];
    if (!items.length) {
      content = 'I could not find matching FAQ or policy information yet. Make sure the assistant knowledge rows have embeddings by running npm run sync:knowledge -- --skip-vehicles.';
      toolResult.preview = null;
    } else {
      const category = tool.args?.categories?.[0] || items[0]?.category;
      const lines = items.slice(0, 5).map((item) => `- ${item.title}: ${item.content}`);
      content = `${getKnowledgeIntro({ category, message })}\n${lines.join('\n')}`;
    }
  }

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'assistant',
    content,
    metadata: { provider: assistantProvider, toolsUsed: [tool.name], directTool: true },
  }).catch((error) => console.error('[assistant] failed to log assistant message', error.message));

  return {
    conversationId: id,
    message: {
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
    },
    toolsUsed: [tool.name],
    toolResults: selectDisplayToolResults([toolResult.preview].filter(Boolean)),
  };
};

const runPendingActionConfirmation = async ({ user, message, context, conversationId }) => {
  const pendingAction = getLatestPendingAction(context);
  if (!pendingAction) return null;

  if (isRejectionMessage(message)) {
    return {
      conversationId: conversationId || createConversationId(),
      message: {
        role: 'assistant',
        content: 'Okay, I cancelled that pending action. Nothing was changed.',
        createdAt: new Date().toISOString(),
      },
      toolsUsed: [],
      toolResults: [{
        type: 'actionResult',
        title: 'Action cancelled',
        actionType: pendingAction.actionType,
        status: 'cancelled',
        result: {},
      }],
    };
  }

  if (!isConfirmationMessage(message)) return null;

  const id = conversationId || createConversationId();
  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'user',
    content: message,
    metadata: { source: 'assistant_chat', provider: assistantProvider, confirmedAction: pendingAction.actionType },
  }).catch((error) => console.error('[assistant] failed to log user message', error.message));

  const startedAt = Date.now();
  let result;
  try {
    result = await executeConfirmedAssistantAction({ action: pendingAction, user });
  } catch (error) {
    await logAssistantToolCall({
      conversationId: id,
      userId: user.id,
      toolName: `confirm:${pendingAction.actionType}`,
      input: pendingAction.payload,
      success: false,
      latencyMs: Date.now() - startedAt,
      error: error.message || 'Action failed',
    }).catch((logError) => console.error('[assistant] failed to log failed confirmed action', logError.message));

    const content = getAssistantFriendlyError(error);
    await logAssistantMessage({
      conversationId: id,
      userId: user.id,
      role: 'assistant',
      content,
      metadata: {
        provider: assistantProvider,
        actionType: pendingAction.actionType,
        actionStatus: 'failed',
        error: error.message || 'Action failed',
      },
    }).catch((logError) => console.error('[assistant] failed to log assistant message', logError.message));

    return {
      conversationId: id,
      message: {
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
      },
      toolsUsed: [`confirm:${pendingAction.actionType}`],
      toolResults: [{
        type: 'actionResult',
        title: 'Action failed',
        actionType: pendingAction.actionType,
        status: 'failed',
        result: {
          error: error.message || 'Action failed',
          reason: isClientVerificationRequired(error) ? 'driver_license_required' : 'action_failed',
        },
      }],
    };
  }

  await logAssistantToolCall({
    conversationId: id,
    userId: user.id,
    toolName: `confirm:${pendingAction.actionType}`,
    input: pendingAction.payload,
    success: true,
    latencyMs: Date.now() - startedAt,
  }).catch((error) => console.error('[assistant] failed to log confirmed action', error.message));

  const content = result.actionType === 'createReservation'
    ? `${result.title}. Please complete the payment within 24 hours or the reservation will be cancelled automatically.`
    : `${result.title}.`;
  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'assistant',
    content,
    metadata: { provider: assistantProvider, actionType: pendingAction.actionType, actionStatus: 'completed' },
  }).catch((error) => console.error('[assistant] failed to log assistant message', error.message));

  return {
    conversationId: id,
    message: {
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
    },
    toolsUsed: [`confirm:${pendingAction.actionType}`],
    toolResults: [result],
  };
};

const executeAuditedTool = async ({ name, rawArguments, user, conversationId }) => {
  const startedAt = Date.now();
  try {
    const data = await executeAssistantTool({ name, rawArguments, user });
    await logAssistantToolCall({
      conversationId,
      userId: user.id,
      toolName: name,
      input: rawArguments || {},
      success: true,
      latencyMs: Date.now() - startedAt,
    }).catch((error) => console.error('[assistant] failed to log tool call', error.message));

    return {
      data,
      preview: createToolResultPreview({ name, data }),
    };
  } catch (error) {
    await logAssistantToolCall({
      conversationId,
      userId: user.id,
      toolName: name,
      input: rawArguments || {},
      success: false,
      latencyMs: Date.now() - startedAt,
      error: error.message || 'Tool failed',
    }).catch((logError) => console.error('[assistant] failed to log tool call', logError.message));
    throw error;
  }
};

const toGeminiRole = (role) => (role === 'assistant' ? 'model' : 'user');

const buildGeminiContents = ({ context, message, user }) => [
  {
    role: 'user',
    parts: [{ text: `Authenticated Rentify user context: id=${user.id}; role=${user.role || 'unknown'}.` }],
  },
  ...normalizeContext(context).map((item) => ({
    role: toGeminiRole(item.role),
    parts: [{ text: item.content }],
  })),
  { role: 'user', parts: [{ text: message }] },
];

const toGeminiSchemaType = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'string') return Type.STRING;
  if (normalized === 'number') return Type.NUMBER;
  if (normalized === 'integer') return Type.INTEGER;
  if (normalized === 'boolean') return Type.BOOLEAN;
  if (normalized === 'array') return Type.ARRAY;
  if (normalized === 'object') return Type.OBJECT;
  return undefined;
};

const toGeminiSchema = (schema = {}) => {
  const type = toGeminiSchemaType(schema.type);
  const converted = {};

  if (type) converted.type = type;
  if (schema.description) converted.description = schema.description;
  if (schema.required) converted.required = schema.required;
  if (schema.enum) converted.enum = schema.enum;

  if (schema.properties) {
    converted.properties = Object.entries(schema.properties).reduce((acc, [key, value]) => {
      acc[key] = toGeminiSchema(value);
      return acc;
    }, {});
  }

  if (schema.items) converted.items = toGeminiSchema(schema.items);
  return converted;
};

const geminiToolDeclarations = assistantToolDefinitions.map((tool) => ({
  name: tool.function.name,
  description: tool.function.description,
  parameters: toGeminiSchema({
    type: 'object',
    ...(tool.function.parameters || {}),
  }),
}));

const inferMockTool = (message) => {
  const text = String(message || '').toLowerCase();
  const reservationNumberMatch = text.match(/(?:reservation|booking|trip)\s+(?:number\s+)?(\d+)|(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\s+(?:reservation|booking|trip)/);
  const listingNumberMatch = text.match(/(?:listing|vehicle)\s+(?:number\s+)?(\d+)|(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\s+(?:listing|vehicle)/);
  const carNumberMatch = text.match(/car\s+(?:number\s+)?(\d+)|(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\s+car/);
  const ordinalMap = {
    first: 1,
    '1st': 1,
    second: 2,
    '2nd': 2,
    third: 3,
    '3rd': 3,
    fourth: 4,
    '4th': 4,
    fifth: 5,
    '5th': 5,
  };
  const ordinal = Object.entries(ordinalMap).find(([word]) => text.includes(word))?.[1];

  if (reservationNumberMatch) {
    return { name: 'getReservationDetails', args: { reservationNumber: Number(reservationNumberMatch[1] || ordinal) } };
  }

  if (carNumberMatch || (listingNumberMatch && text.includes('car'))) {
    return { name: 'getCarDetails', args: { listingNumber: Number(carNumberMatch?.[1] || listingNumberMatch?.[1] || ordinal) } };
  }

  if (listingNumberMatch) {
    return { name: 'getListingDetails', args: { listingNumber: Number(listingNumberMatch[1] || ordinal) } };
  }

  if (text.includes('reservation') || text.includes('booking') || text.includes('trip')) {
    return { name: 'getReservations', args: {} };
  }

  if (text.includes('my review') || text.includes('reviews i left') || text.includes('reviews left')) {
    return { name: 'getMyReviews', args: { limit: 5 } };
  }

  if (text.includes('profile') || text.includes('account') || text.includes('me')) {
    return { name: 'getUserProfile', args: {} };
  }

  if (text.includes('detail') || text.includes('vehicle id') || text.includes('listing id')) {
    const idMatch = text.match(/[0-9a-f]{8}-[0-9a-f-]{27,}/i);
    if (idMatch) return { name: 'getVehicleDetails', args: { vehicleId: idMatch[0] } };
  }

  const filters = {};
  const cityMatch = text.match(/\b(?:in|at)\s+([a-zA-ZÀ-ÿ '-]{2,40})/);
  const maxPriceMatch = text.match(/(?:under|below|less than|max)\s+(\d+)/);
  const seatsMatch = text.match(/(\d+)\s+seats?/);

  if (cityMatch) filters.city = cityMatch[1].trim();
  if (maxPriceMatch) filters.maxPrice = Number(maxPriceMatch[1]);
  if (seatsMatch) filters.seats = Number(seatsMatch[1]);
  if (text.includes('automatic')) filters.transmission = 'automatic';
  if (text.includes('manual')) filters.transmission = 'manual';
  if (text.includes('hybrid')) filters.fuelType = 'hybrid';
  if (text.includes('electric')) filters.fuelType = 'electric';
  if (text.includes('diesel')) filters.fuelType = 'diesel';
  if (text.includes('petrol') || text.includes('gasoline')) filters.fuelType = 'petrol';

  return { name: 'searchVehicles', args: { ...filters, limit: 5 } };
};

const summarizeMockResult = ({ toolName, result }) => {
  if (toolName === 'getReservations') {
    if (!result.length) return 'I did not find any reservations for your account.';

    const lines = result.slice(0, 5).map((reservation) => {
      const car = reservation.listing?.car;
      const carName = car ? `${car.brand || ''} ${car.model || ''}`.trim() : reservation.listing?.title || 'vehicle';
      return `- ${carName}: ${reservation.startDate} to ${reservation.endDate}, status ${reservation.status}, total ${reservation.totalPrice}`;
    });

    return `Here are your latest reservations:\n${lines.join('\n')}`;
  }

  if (toolName === 'getReservationDetails') {
    const car = result.listing?.car;
    const carName = car ? `${car.brand || ''} ${car.model || ''}`.trim() : result.listing?.title || 'vehicle';
    return `Here is reservation ${result.referenceNumber || ''}: ${carName}, ${result.startDate} to ${result.endDate}, status ${result.status}, total ${result.totalPrice}.`;
  }

  if (toolName === 'getUserProfile') {
    return `Your profile is ${result.firstName || ''} ${result.lastName || ''} (${result.email}), role ${result.role}. You have ${result.stats?.client?.reservations ?? 0} reservation(s).`;
  }

  if (toolName === 'getMyReviews') {
    if (!result.items?.length) return 'I did not find reviews you have left yet.';
    const lines = result.items.slice(0, 5).map((review) => {
      const carName = review.vehicle ? `${review.vehicle.brand || ''} ${review.vehicle.model || ''}`.trim() : review.listing?.title || 'vehicle';
      return `- ${review.rating}/5 for ${carName}: ${review.comment || 'No comment'}`;
    });
    return `Here are reviews you left:\n${lines.join('\n')}`;
  }

  if (toolName === 'getVehicleDetails') {
    const car = result.car;
    return `Vehicle details: ${result.title || `${car?.brand || ''} ${car?.model || ''}`.trim()} in ${result.city || 'unknown city'}, ${result.country || 'unknown country'}, ${result.pricePerDay} per day. Available from ${result.availableFrom || 'not set'} to ${result.availableTo || 'not set'}.`;
  }

  if (toolName === 'getListingDetails') {
    const car = result.car;
    return `Listing details: ${result.title || 'listing'} for ${car ? `${car.brand || ''} ${car.model || ''}`.trim() : 'vehicle'}, ${result.city || 'unknown city'}, ${result.pricePerDay} per day. Available from ${result.availableFrom || 'not set'} to ${result.availableTo || 'not set'}.`;
  }

  if (toolName === 'getListingAvailability') {
    const blocked = (result.blockedRanges || [])
      .slice(0, 3)
      .map((range) => `${range.startDate} to ${range.endDate}`)
      .join('; ');
    return `${result.title || 'This listing'} is available from ${result.availableFrom || 'not set'} to ${result.availableTo || 'not set'}${blocked ? `. Blocked ranges: ${blocked}.` : '. No blocked reservation ranges were found.'}`;
  }

  if (toolName === 'getCarDetails') {
    return `Car details: ${`${result.brand || ''} ${result.model || ''}`.trim()}, ${result.year || 'year unknown'}, ${result.transmission || 'transmission unknown'}, ${result.fuelType || 'fuel unknown'}.`;
  }

  const items = result.items || [];
  if (!items.length) return 'I did not find matching active listings. Try a broader city, price, or transmission filter.';

  const lines = items.slice(0, 5).map((listing) => {
    const car = listing.car;
    const carName = car ? `${car.brand || ''} ${car.model || ''}`.trim() : listing.title;
    return `- ${carName}: ${listing.city}, ${listing.pricePerDay} per day, available ${listing.availableFrom || 'not set'} to ${listing.availableTo || 'not set'}, ${car?.transmission || 'transmission unknown'}`;
  });

  return `I found these active listings:\n${lines.join('\n')}`;
};

const runMockAssistantChat = async ({ user, message, conversationId }) => {
  const id = conversationId || createConversationId();

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'user',
    content: message,
    metadata: { source: 'assistant_chat', provider: 'mock' },
  }).catch((error) => console.error('[assistant] failed to log user message', error.message));

  const tool = inferMockTool(message);
  const toolResult = await executeAuditedTool({
    name: tool.name,
    rawArguments: tool.args,
    user,
    conversationId: id,
  });

  const answer = `[Mock AI mode] ${summarizeMockResult({ toolName: tool.name, result: toolResult.data })}`;

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'assistant',
    content: answer,
    metadata: { provider: 'mock', toolsUsed: [tool.name] },
  }).catch((error) => console.error('[assistant] failed to log assistant message', error.message));

  return {
    conversationId: id,
    message: {
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    },
    toolsUsed: [tool.name],
    toolResults: selectDisplayToolResults([toolResult.preview]),
  };
};

const runGeminiAssistantChat = async ({ user, message, context, conversationId }) => {
  const ai = getGeminiClient();
  const id = conversationId || createConversationId();
  const contents = buildGeminiContents({ context, message, user });

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'user',
    content: message,
    metadata: { source: 'assistant_chat', provider: 'gemini' },
  }).catch((error) => console.error('[assistant] failed to log user message', error.message));

  let response;
  let toolRound = 0;
  const toolsUsed = [];
  const toolResults = [];

  while (toolRound <= maxToolRounds) {
    response = await ai.models.generateContent({
      model: geminiModel,
      contents,
      config: {
        systemInstruction: assistantSystemPrompt,
        tools: [{ functionDeclarations: geminiToolDeclarations }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
          },
        },
      },
    });

    const functionCalls = response.functionCalls || [];
    if (!functionCalls.length) break;

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent?.parts?.length) {
      contents.push(modelContent);
    } else {
      contents.push({
        role: 'model',
        parts: functionCalls.map((functionCall) => ({ functionCall })),
      });
    }

    if (toolRound === maxToolRounds) {
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: functionCalls[0].name,
            response: { ok: false, error: 'Tool round limit reached' },
          },
        }],
      });
      break;
    }

    const toolResponseParts = [];
    for (const functionCall of functionCalls) {
      try {
        const toolResult = await executeAuditedTool({
          name: functionCall.name,
          rawArguments: functionCall.args || {},
          user,
          conversationId: id,
        });

        toolsUsed.push(functionCall.name);
        toolResults.push(toolResult.preview);
        toolResponseParts.push({
          functionResponse: {
            id: functionCall.id,
            name: functionCall.name,
            response: { ok: true, data: toolResult.data },
          },
        });
      } catch (error) {
        toolResponseParts.push({
          functionResponse: {
            id: functionCall.id,
            name: functionCall.name,
            response: { ok: false, error: error.message || 'Tool failed' },
          },
        });
      }
    }

    contents.push({ role: 'user', parts: toolResponseParts });
    toolRound += 1;
  }

  const answer = response?.text?.trim?.() || '';
  if (!answer) throw new Error('Gemini returned an empty response');

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'assistant',
    content: answer,
    metadata: {
      provider: 'gemini',
      model: geminiModel,
      toolsUsed: [...new Set(toolsUsed)],
      usage: response?.usageMetadata || null,
    },
  }).catch((error) => console.error('[assistant] failed to log assistant message', error.message));

  return {
    conversationId: id,
    message: {
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    },
    toolsUsed: [...new Set(toolsUsed)],
    toolResults: selectDisplayToolResults(toolResults),
  };
};

export const runAssistantChat = async ({ user, message, context, conversationId }) => {
  const confirmedActionResult = await runPendingActionConfirmation({ user, message, context, conversationId });
  if (confirmedActionResult) return confirmedActionResult;

  const directRentalTool = resolveDirectRentalTool({ message, context });
  if (directRentalTool) {
    return runSingleToolResponse({
      user,
      message,
      conversationId,
      tool: directRentalTool,
    });
  }

  const directKnowledgeTool = resolveDirectKnowledgeTool({ message });
  if (directKnowledgeTool) {
    return runSingleToolResponse({
      user,
      message,
      conversationId,
      tool: directKnowledgeTool,
    });
  }

  const directDetailTool = resolveDirectDetailTool({ message, context });
  if (directDetailTool) {
    return runSingleToolResponse({
      user,
      message,
      conversationId,
      tool: directDetailTool,
      answer: directDetailTool.name === 'getCarDetails'
        ? 'Here are the car details.'
        : directDetailTool.name === 'getListingAvailability'
          ? 'Here is the listing availability.'
          : 'Here are the listing details.',
    });
  }

  if (assistantProvider === 'mock') {
    return runMockAssistantChat({ user, message, conversationId });
  }

  if (assistantProvider === 'gemini') {
    return runGeminiAssistantChat({ user, message, context, conversationId });
  }

  const openai = getOpenAIClient();
  const id = conversationId || createConversationId();
  const messages = buildInitialMessages({ context, message, user });

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'user',
    content: message,
    metadata: { source: 'assistant_chat' },
  }).catch((error) => console.error('[assistant] failed to log user message', error.message));

  let completion;
  let toolRound = 0;
  const toolsUsed = [];
  const toolResults = [];

  while (toolRound <= maxToolRounds) {
    completion = await openai.chat.completions.create({
      model,
      messages,
      tools: assistantToolDefinitions,
      tool_choice: 'auto',
    });

    const assistantMessage = completion.choices?.[0]?.message;
    if (!assistantMessage) throw new Error('Assistant did not return a response');

    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls || [];
    if (toolCalls.length === 0) break;

    if (toolRound === maxToolRounds) {
      messages.push({
        role: 'tool',
        tool_call_id: toolCalls[0].id,
        content: JSON.stringify({ error: 'Tool round limit reached' }),
      });
      break;
    }

    for (const toolCall of toolCalls) {
      const name = toolCall.function?.name;
      try {
        const toolResult = await executeAuditedTool({
          name,
          rawArguments: toolCall.function?.arguments,
          user,
          conversationId: id,
        });

        toolsUsed.push(name);
        toolResults.push(toolResult.preview);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ ok: true, data: toolResult.data }),
        });
      } catch (error) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ ok: false, error: error.message || 'Tool failed' }),
        });
      }
    }

    toolRound += 1;
  }

  const answer = parseResponseText(completion);
  if (!answer) throw new Error('Assistant returned an empty response');

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'assistant',
    content: answer,
    metadata: {
      model,
      toolsUsed: [...new Set(toolsUsed)],
      usage: completion?.usage || null,
    },
  }).catch((error) => console.error('[assistant] failed to log assistant message', error.message));

  return {
    conversationId: id,
    message: {
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    },
    toolsUsed: [...new Set(toolsUsed)],
    toolResults: selectDisplayToolResults(toolResults),
  };
};
