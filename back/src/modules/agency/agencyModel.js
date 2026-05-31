import { supabase } from '../../config/supabase.js';
import { getDocumentOcrResultByDocumentId } from '../documents/documentOcrModel.js';
import { hasApprovedDocument } from '../documents/documentModel.js';

const COMPANY_TABLE = 'company';
const CARS_TABLE = 'cars';
const LISTINGS_TABLE = 'listings';
const DOCUMENTS_TABLE = 'documents';
const RESERVATIONS_TABLE = 'reservations';
const FEEDBACK_TABLE = 'feedback';
const FAVORITES_TABLE = 'favorites';
const PAYMENTS_TABLE = 'payments';
const USERS_TABLE = 'users';

const ACTIVE_RESERVATION_STATUSES = new Set(['confirmed', 'pickup_pending', 'active', 'return_pending']);
const REQUEST_APPROVED_STATUSES = new Set(['confirmed', 'pickup_pending', 'active', 'return_pending', 'finished']);
const REQUEST_REJECTED_STATUSES = new Set(['cancelled', 'refunded']);
const REQUIRED_CAR_DOC_TYPES = ['carte_grise', 'insurance', 'technical_control'];

const toNumber = (value) => Number(value || 0) || 0;

const normalize = (value) => String(value || '').trim();

const monthRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    daysInMonth: end.getUTCDate(),
  };
};

const overlapDays = (startA, endA, startB, endB) => {
  const start = Math.max(new Date(startA).getTime(), new Date(startB).getTime());
  const end = Math.min(new Date(endA).getTime(), new Date(endB).getTime());
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
};

const statusToCard = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'rejected') return 'REJECTED';
  if (normalized === 'approved') return 'VERIFIED';
  return 'PENDING';
};

const docTypeLabel = (type) => ({
  business_registration: 'Registre de commerce',
  nif: 'NIF / NIS',
  carte_grise: 'Carte grise',
  insurance: 'Assurance',
  technical_control: 'Contrôle technique',
  professional_insurance: 'Assurance professionnelle',
}[type] || type);

const requestStatusToCard = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (REQUEST_REJECTED_STATUSES.has(normalized)) return 'REJECTED';
  if (normalized === 'reserved') return 'PENDING';
  if (REQUEST_APPROVED_STATUSES.has(normalized)) return 'APPROVED';
  return 'PENDING';
};

const getPrimaryImage = (car) => {
  const images = Array.isArray(car?.car_images) ? car.car_images : [];
  return (
    images.find((img) => img?.is_primary && img?.image_url)?.image_url ||
    images.find((img) => img?.image_url)?.image_url ||
    null
  );
};

const countFilledFields = (company) => {
  const values = [
    company?.company_name,
    company?.company_email,
    company?.company_phone,
    company?.registration_number,
    company?.city,
    company?.country,
  ];
  return values.filter((value) => normalize(value)).length;
};

const buildAgencyVerification = ({ company, companyDocs = [], carDocs = [] }) => {
  const allDocs = [...companyDocs, ...carDocs];
  const docStats = allDocs.reduce(
    (acc, doc) => {
      const status = statusToCard(doc.status);
      if (status === 'VERIFIED') acc.verified += 1;
      else if (status === 'REJECTED') acc.rejected += 1;
      else acc.pending += 1;
      return acc;
    },
    { verified: 0, pending: 0, rejected: 0 }
  );

  const coreFilled = countFilledFields(company);
  const docRatio = Math.min(1, docStats.verified / Math.max(1, REQUIRED_CAR_DOC_TYPES.length + 3));
  const coreRatio = coreFilled / 6;
  const completionPercentage = Math.max(0, Math.min(100, Math.round((coreRatio * 60) + (docRatio * 40))));

  let verificationStatus = 'PENDING';
  if (docStats.rejected > 0) verificationStatus = 'REJECTED';
  else if (coreFilled < 4) verificationStatus = 'INCOMPLETE';
  else if (completionPercentage >= 80 && docStats.pending === 0) verificationStatus = 'VERIFIED';

  return {
    ...docStats,
    completionPercentage,
    verificationStatus,
  };
};

const toAgencyDto = (company, verification = {}) => ({
  id: company.id,
  commercialName: company.company_name || 'Agence',
  corporateName: company.company_name || 'Agence SARL',
  registrationNumber: company.registration_number || '',
  nif: company.nif || '',
  managerName: company.company_name || 'Responsable',
  managerPhone: company.company_phone || '',
  verificationStatus: verification.verificationStatus || 'PENDING',
  completionPercentage: verification.completionPercentage || 0,
  createdAt: company.created_at,
  updatedAt: company.updated_at || company.created_at,
  companyEmail: company.company_email || '',
  companyPhone: company.company_phone || '',
  address: company.address || '',
  city: company.city || '',
  country: company.country || '',
});

const toDocumentDto = (doc, car = null) => ({
  id: doc.id,
  companyId: doc.company_id,
  userId: doc.user_id,
  carId: doc.car_id,
  ownerLabel: doc.company_id ? 'Agence' : doc.user_id ? 'Gérant' : `${car?.brand || 'Véhicule'} ${car?.model || ''}`.trim(),
  documentType: doc.document_type,
  documentTypeLabel: docTypeLabel(doc.document_type),
  documentUrl: doc.document_url,
  status: statusToCard(doc.status),
  reviewedBy: doc.reviewed_by,
  reviewedAt: doc.reviewed_at,
  createdAt: doc.created_at,
});

const attachOcrResults = async (documents = []) => Promise.all(
  documents.map(async (doc) => ({
    ...doc,
    ocrResult: await getDocumentOcrResultByDocumentId(doc.id),
  }))
);

const buildDocStats = (documents = []) => documents.reduce(
  (acc, doc) => {
    const status = statusToCard(doc.status);
    if (status === 'VERIFIED') acc.verified += 1;
    else if (status === 'REJECTED') acc.rejected += 1;
    else acc.pending += 1;
    return acc;
  },
  { verified: 0, pending: 0, rejected: 0 }
);

const hasRequiredCarDocuments = (docStats = {}) => Number(docStats.verified || 0) >= REQUIRED_CAR_DOC_TYPES.length;

const getAgencyRecord = async (managerId) => {
  const { data, error } = await supabase
    .from(COMPANY_TABLE)
    .select('*')
    .eq('manager_id', managerId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: user, error: userError } = await supabase
    .from(USERS_TABLE)
    .select('id, email, first_name, last_name, phone')
    .eq('id', managerId)
    .single();

  if (userError || !user) throw new Error('Agency not found');

  const fullName = normalize(`${user.first_name || ''} ${user.last_name || ''}`) || normalize(user.email?.split('@')?.[0]) || 'Agence';
  const payload = {
    manager_id: managerId,
    company_name: fullName,
    company_email: user.email || null,
    company_phone: user.phone || null,
  };

  const { data: created, error: createError } = await supabase
    .from(COMPANY_TABLE)
    .insert([payload])
    .select('*')
    .single();

  if (createError || !created) throw createError || new Error('Agency not found');
  return created;
};

const getCarsByManager = async (managerId) => {
  const { data, error } = await supabase
    .from(CARS_TABLE)
    .select('*, car_images(id, image_url, is_primary, uploaded_at)')
    .eq('owner_id', managerId);

  if (error) throw error;
  return data || [];
};

const getListingsByCarIds = async (carIds = []) => {
  if (!carIds.length) return [];
  const { data, error } = await supabase
    .from(LISTINGS_TABLE)
    .select('id, car_id, title, city, country, price_per_day, price_per_week, price_per_month, available_from, available_to, is_active, created_at')
    .in('car_id', carIds);
  if (error) throw error;
  return data || [];
};

const getDocumentsForAgency = async ({ agencyId, managerId, carIds = [] }) => {
  const [companyDocsRes, carDocsRes, managerDocsRes] = await Promise.all([
    supabase.from(DOCUMENTS_TABLE).select('*').eq('company_id', agencyId),
    managerId ? supabase.from(DOCUMENTS_TABLE).select('*').eq('user_id', managerId) : Promise.resolve({ data: [], error: null }),
    carIds.length ? supabase.from(DOCUMENTS_TABLE).select('*').in('car_id', carIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (companyDocsRes.error) throw companyDocsRes.error;
  if (managerDocsRes.error) throw managerDocsRes.error;
  if (carDocsRes.error) throw carDocsRes.error;

  return {
    companyDocs: companyDocsRes.data || [],
    managerDocs: managerDocsRes.data || [],
    carDocs: carDocsRes.data || [],
  };
};

const getReservationsByListingIds = async (listingIds = []) => {
  if (!listingIds.length) return [];
  const { data, error } = await supabase
    .from(RESERVATIONS_TABLE)
    .select('id, listing_id, renter_id, start_date, end_date, total_price, status, created_at, listings(id, car_id, title, city, country, price_per_day, cars(id, brand, model)), users(id, first_name, last_name, profile_picture)')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const getReservationRatings = async (reservationIds = []) => {
  if (!reservationIds.length) return [];
  const { data, error } = await supabase
    .from(FEEDBACK_TABLE)
    .select('reservation_id, reviewer_id, rating, created_at')
    .in('reservation_id', reservationIds);
  if (error) throw error;
  return data || [];
};

const getFavoritesByListingIds = async (listingIds = []) => {
  if (!listingIds.length) return [];
  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .select('listing_id')
    .in('listing_id', listingIds);
  if (error) throw error;
  return data || [];
};

const getPaymentsByReservationIds = async (reservationIds = []) => {
  if (!reservationIds.length) return [];
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .select('reservation_id, amount, status, created_at')
    .in('reservation_id', reservationIds);
  if (error) throw error;
  return data || [];
};

const getRentersByIds = async (renterIds = []) => {
  const ids = [...new Set(renterIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, first_name, last_name, profile_picture')
    .in('id', ids);
  if (error) throw error;
  return Object.fromEntries((data || []).map((user) => [user.id, user]));
};

const buildVehicleRecords = ({ cars = [], listings = [], carDocs = [], reservations = [], ratings = [], favorites = [], monthStart, monthEnd }) => {
  const listingByCar = Object.fromEntries(listings.map((listing) => [listing.car_id, listing]));
  const docsByCar = carDocs.reduce((acc, doc) => {
    if (!acc[doc.car_id]) acc[doc.car_id] = [];
    acc[doc.car_id].push(doc);
    return acc;
  }, {});
  const reservationsByCar = reservations.reduce((acc, reservation) => {
    const carId = reservation?.listings?.car_id;
    if (!carId) return acc;
    if (!acc[carId]) acc[carId] = [];
    acc[carId].push(reservation);
    return acc;
  }, {});
  const ratingsByReservation = Object.fromEntries(ratings.map((row) => [row.reservation_id, row]));
  const favoritesByCar = favorites.reduce((acc, item) => {
    const listing = listingByCar[item.listing_id];
    const carId = listing?.car_id;
    if (!carId) return acc;
    if (!acc[carId]) acc[carId] = 0;
    acc[carId] += 1;
    return acc;
  }, {});

  return cars.map((car) => {
    const listing = listingByCar[car.id] || null;
    const docs = docsByCar[car.id] || [];
    const docStats = buildDocStats(docs);
    const carReservations = reservationsByCar[car.id] || [];
    const activeReservation = carReservations.find((reservation) => ACTIVE_RESERVATION_STATUSES.has(String(reservation.status || '').toLowerCase()));
    const rentalCount = carReservations.length;
    const monthlyRentalCount = carReservations.filter((reservation) => {
      const createdAt = new Date(reservation.created_at || 0);
      return createdAt.toISOString().slice(0, 7) === monthStart.slice(0, 7);
    }).length;
    const revenueDA = carReservations.reduce((sum, reservation) => sum + toNumber(reservation.total_price), 0);
    const reviewRows = carReservations
      .map((reservation) => ratingsByReservation[reservation.id])
      .filter(Boolean);
    const averageRating = reviewRows.length
      ? reviewRows.reduce((sum, row) => sum + toNumber(row.rating), 0) / reviewRows.length
      : 0;
    const docsReady = hasRequiredCarDocuments(docStats);
    const vehicleStatus = !listing?.is_active || !docsReady
      ? 'HIDDEN'
      : activeReservation
        ? 'RENTED'
        : 'AVAILABLE';

    return {
      id: car.id,
      carId: car.id,
      listingId: listing?.id || null,
      brand: car.brand,
      model: car.model,
      year: car.year,
      color: car.color,
      mileage: car.mileage,
      seats: car.seats,
      transmission: car.transmission,
      fuelType: car.fuel_type,
      registrationNumber: car.registration_number,
      description: car.description,
      imageUrl: getPrimaryImage(car),
      visibleByTenants: Boolean(listing?.is_active && docsReady),
      canToggleVisibility: docsReady,
      status: vehicleStatus,
      documentStatus: docStats.rejected > 0 ? 'DOCS_REJECTED' : (docStats.verified >= REQUIRED_CAR_DOC_TYPES.length ? 'DOCS_OK' : 'DOCS_PENDING'),
      totalReservations: rentalCount,
      monthlyReservations: monthlyRentalCount,
      revenueDA,
      averageRating: Number(averageRating.toFixed(1)),
      reviewCount: reviewRows.length,
      favoritesCount: favoritesByCar[car.id] || 0,
      documents: docs.map((doc) => toDocumentDto(doc, car)),
      reservations: carReservations,
      listing: listing ? {
        id: listing.id,
        title: listing.title,
        city: listing.city,
        country: listing.country,
        pricePerDay: listing.price_per_day,
        pricePerWeek: listing.price_per_week,
        pricePerMonth: listing.price_per_month,
        availableFrom: listing.available_from,
        availableTo: listing.available_to,
        isActive: listing.is_active,
      } : null,
      createdAt: car.created_at,
      updatedAt: car.updated_at || car.created_at,
      carImages: car.car_images || [],
    };
  });
};

export const getAgencyByManagerId = async (managerId) => {
  const company = await getAgencyRecord(managerId);
  const { companyDocs, managerDocs, carDocs } = await getDocumentsForAgency({ agencyId: company.id, managerId, carIds: [] });
  return toAgencyDto(company, buildAgencyVerification({ company, companyDocs, carDocs: [...managerDocs, ...carDocs] }));
};

export const getAgencyDashboard = async (managerId) => {
  const company = await getAgencyRecord(managerId);
  const cars = await getCarsByManager(managerId);
  const carIds = cars.map((car) => car.id);
  const listings = await getListingsByCarIds(carIds);
  const listingIds = listings.map((listing) => listing.id);
  const { companyDocs, managerDocs, carDocs } = await getDocumentsForAgency({ agencyId: company.id, managerId, carIds });
  const reservations = await getReservationsByListingIds(listingIds);
  const reservationIds = reservations.map((reservation) => reservation.id);
  const ratings = await getReservationRatings(reservationIds);
  const favorites = await getFavoritesByListingIds(listingIds);
  const payments = await getPaymentsByReservationIds(reservationIds);
  const renters = await getRentersByIds(reservations.map((reservation) => reservation.renter_id));

  const month = monthRange();
  const vehicles = buildVehicleRecords({
    cars,
    listings,
    carDocs,
    reservations,
    ratings,
    favorites,
    monthStart: month.start,
    monthEnd: month.end,
  });

  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter((vehicle) => vehicle.status === 'AVAILABLE').length;
  const rentedVehicles = vehicles.filter((vehicle) => vehicle.status === 'RENTED').length;
  const totalReservations = reservations.length;
  const monthlyRevenue = payments.reduce((sum, payment) => {
    const createdAt = new Date(payment.created_at || 0);
    if (createdAt.toISOString().slice(0, 7) !== month.start.slice(0, 7)) return sum;
    const status = String(payment.status || '').toLowerCase();
    if (!['completed', 'paid'].includes(status)) return sum;
    return sum + toNumber(payment.amount);
  }, 0);

  let rentedDays = 0;
  let availableDays = 0;
  for (const vehicle of vehicles) {
    const listing = vehicle.listing;
    const listingStart = listing?.availableFrom || month.start;
    const listingEnd = listing?.availableTo || month.end;
    availableDays += overlapDays(listingStart, listingEnd, month.start, month.end) || month.daysInMonth;
    for (const reservation of vehicle.reservations || []) {
      if (!ACTIVE_RESERVATION_STATUSES.has(String(reservation.status || '').toLowerCase())) continue;
      rentedDays += overlapDays(reservation.start_date, reservation.end_date, month.start, month.end);
    }
  }

  const occupancyRate = availableDays > 0 ? Math.min(100, Math.round((rentedDays / availableDays) * 100)) : 0;
  const acceptedReservations = reservations.filter((reservation) => REQUEST_APPROVED_STATUSES.has(String(reservation.status || '').toLowerCase())).length;
  const acceptanceRate = totalReservations > 0 ? Math.round((acceptedReservations / totalReservations) * 100) : 0;
  const reviewCount = ratings.length;
  const clientSatisfaction = reviewCount > 0
    ? Number((ratings.reduce((sum, row) => sum + toNumber(row.rating), 0) / reviewCount).toFixed(1))
    : 0;
  const totalViews = favorites.length * 20 + totalReservations * 5;

  const latestRequests = reservations
    .slice()
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 3)
    .map((reservation) => {
      const listing = listings.find((item) => item.id === reservation.listing_id) || null;
      const car = listing ? cars.find((item) => item.id === listing.car_id) || null : null;
      const renter = renters[reservation.renter_id] || null;
      const mappedStatus = requestStatusToCard(reservation.status);
      return {
        id: reservation.id,
        status: mappedStatus,
        statusLabel: mappedStatus === 'PENDING' ? 'En attente' : mappedStatus === 'APPROVED' ? 'Approuvée' : 'Refusée',
        renterName: renter ? `${renter.first_name || ''} ${renter.last_name || ''}`.trim() : 'Client',
        vehicleName: car ? `${car.brand || ''} ${car.model || ''}`.trim() : listing?.title || 'Véhicule',
        startDate: reservation.start_date,
        endDate: reservation.end_date,
        totalPrice: toNumber(reservation.total_price),
        createdAt: reservation.created_at,
      };
    });

  return {
    agency: toAgencyDto(company, buildAgencyVerification({ company, companyDocs, carDocs: [...managerDocs, ...carDocs] })),
    counters: {
      totalVehicles,
      availableVehicles,
      rentedVehicles,
      totalReservations,
      totalViews,
      monthlyRevenue,
    },
    monthlyMetrics: {
      occupancyRate,
      clientSatisfaction,
      acceptanceRate,
    },
    latestRequests,
    vehicles,
  };
};

export const getAgencyDocuments = async (managerId) => {
  const company = await getAgencyRecord(managerId);
  const cars = await getCarsByManager(managerId);
  const carIds = cars.map((car) => car.id);
  const { companyDocs, managerDocs, carDocs } = await getDocumentsForAgency({ agencyId: company.id, managerId, carIds });
  const carMap = Object.fromEntries(cars.map((car) => [car.id, car]));
  const documents = await attachOcrResults([...companyDocs, ...managerDocs, ...carDocs]
    .map((doc) => toDocumentDto(doc, carMap[doc.car_id] || null))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));

  const counters = documents.reduce(
    (acc, doc) => {
      if (doc.status === 'VERIFIED') acc.verified += 1;
      else if (doc.status === 'REJECTED') acc.rejected += 1;
      else acc.pending += 1;
      return acc;
    },
    { verified: 0, pending: 0, rejected: 0 }
  );

  return {
    agency: toAgencyDto(company, buildAgencyVerification({ company, companyDocs, carDocs: [...managerDocs, ...carDocs] })),
    counters,
    documents,
  };
};

export const getAgencyVehicles = async (managerId, filters = {}) => {
  const company = await getAgencyRecord(managerId);
  const cars = await getCarsByManager(managerId);
  const carIds = cars.map((car) => car.id);
  const listings = await getListingsByCarIds(carIds);
  const listingIds = listings.map((listing) => listing.id);
  const { carDocs } = await getDocumentsForAgency({ agencyId: company.id, carIds });
  const reservations = await getReservationsByListingIds(listingIds);
  const reservationIds = reservations.map((reservation) => reservation.id);
  const ratings = await getReservationRatings(reservationIds);
  const favorites = await getFavoritesByListingIds(listingIds);
  const month = monthRange();

  const vehicles = buildVehicleRecords({
    cars,
    listings,
    carDocs,
    reservations,
    ratings,
    favorites,
    monthStart: month.start,
    monthEnd: month.end,
  });

  const summary = {
    totalViews: vehicles.reduce((sum, vehicle) => sum + (vehicle.favoritesCount * 20) + (vehicle.totalReservations * 5), 0),
    totalReservations: vehicles.reduce((sum, vehicle) => sum + vehicle.totalReservations, 0),
    averageRating: vehicles.length
      ? Number((vehicles.reduce((sum, vehicle) => sum + Number(vehicle.averageRating || 0), 0) / vehicles.length).toFixed(1))
      : 0,
  };

  const statusFilter = String(filters.status || 'ALL').toUpperCase();
  const documentFilter = String(filters.documentStatus || filters.document_status || 'ALL').toUpperCase();

  const items = vehicles.filter((vehicle) => {
    if (statusFilter !== 'ALL' && vehicle.status !== statusFilter) return false;
    if (documentFilter !== 'ALL' && vehicle.documentStatus !== documentFilter) return false;
    return true;
  });

  return {
    agency: toAgencyDto(company, buildAgencyVerification({ company, carDocs })),
    items,
    counts: {
      available: vehicles.filter((vehicle) => vehicle.status === 'AVAILABLE').length,
      rented: vehicles.filter((vehicle) => vehicle.status === 'RENTED').length,
      hidden: vehicles.filter((vehicle) => vehicle.status === 'HIDDEN').length,
      maintenance: 0,
    },
    summary,
    total: items.length,
  };
};

export const toggleAgencyVehicleVisibility = async (managerId, vehicleId) => {
  const { data: car, error } = await supabase
    .from(CARS_TABLE)
    .select('*')
    .eq('id', vehicleId)
    .single();

  if (error || !car) throw error || new Error('Vehicle not found');
  if (car.owner_id !== managerId) throw new Error('Access denied for this vehicle');

  const { data: listing, error: listingError } = await supabase
    .from(LISTINGS_TABLE)
    .select('id, is_active')
    .eq('car_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (listingError) throw listingError;

  if (!listing) {
    return {
      id: car.id,
      visibleByTenants: true,
    };
  }

  const nextVisibility = !Boolean(listing.is_active);
  if (nextVisibility) {
    const hasIdentityCard = await hasApprovedDocument({
      userId: managerId,
      documentType: 'identity_card',
    });
    if (!hasIdentityCard) {
      throw new Error('Upload and verify your identity card before publishing vehicles.');
    }
  }

  const { data: docs, error: docsError } = await supabase
    .from(DOCUMENTS_TABLE)
    .select('document_type, status')
    .eq('car_id', vehicleId);

  if (docsError) throw docsError;

  const docStats = buildDocStats(docs || []);
  if (!hasRequiredCarDocuments(docStats)) {
    throw new Error('Upload the required car documents before making this vehicle visible.');
  }

  const { data: updated, error: updateError } = await supabase
    .from(LISTINGS_TABLE)
    .update({ is_active: !Boolean(listing.is_active) })
    .eq('id', listing.id)
    .select('id, is_active')
    .single();

  if (updateError || !updated) throw updateError || new Error('Visibility update failed');
  return {
    id: car.id,
    visibleByTenants: Boolean(updated.is_active),
  };
};

export const getAgencyRequests = async (managerId, filters = {}) => {
  const company = await getAgencyRecord(managerId);
  const cars = await getCarsByManager(managerId);
  const carIds = cars.map((car) => car.id);
  const listings = await getListingsByCarIds(carIds);
  const listingIds = listings.map((listing) => listing.id);

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.max(1, Math.min(50, Number(filters.limit || 10)));
  const statusFilter = String(filters.status || 'ALL').toUpperCase();

  const { data: reservations, count, error } = listingIds.length
    ? await supabase
      .from(RESERVATIONS_TABLE)
      .select('id, listing_id, renter_id, start_date, end_date, total_price, status, created_at, listings(id, car_id, title, city, country, price_per_day, cars(id, brand, model)), users(id, first_name, last_name, profile_picture)', { count: 'exact' })
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)
    : { data: [], count: 0, error: null };

  if (error) throw error;

  const reservationIds = (reservations || []).map((reservation) => reservation.id).filter(Boolean);
  const { data: ratings, error: ratingsError } = reservationIds.length
    ? await supabase
      .from(FEEDBACK_TABLE)
      .select('reservation_id, reviewer_id, rating, created_at')
      .in('reservation_id', reservationIds)
    : { data: [], error: null };

  if (ratingsError) throw ratingsError;

  const ratingMap = (ratings || []).reduce((acc, row) => {
    if (!acc[row.reviewer_id]) acc[row.reviewer_id] = [];
    acc[row.reviewer_id].push(toNumber(row.rating));
    return acc;
  }, {});

  const items = (reservations || []).map((reservation) => {
    const listing = reservation.listings || listings.find((item) => item.id === reservation.listing_id) || null;
    const renter = reservation.users || null;
    const renterRatings = ratingMap[reservation.renter_id] || [];
    const renterRating = renterRatings.length ? renterRatings.reduce((sum, value) => sum + value, 0) / renterRatings.length : 4.7;
    const mappedStatus = requestStatusToCard(reservation.status);

    return {
      id: reservation.id,
      status: mappedStatus,
      statusLabel: mappedStatus === 'PENDING' ? 'En attente' : mappedStatus === 'APPROVED' ? 'Approuvée' : 'Refusée',
      renter: {
        id: renter?.id || reservation.renter_id,
        firstName: renter?.first_name || 'Client',
        lastName: renter?.last_name || '',
        profilePicture: renter?.profile_picture || null,
        rating: Number(renterRating.toFixed(1)),
      },
      vehicle: listing
        ? {
            id: listing.car_id,
            brand: listing.cars?.brand || '',
            model: listing.cars?.model || '',
            title: listing.title || '',
          }
        : null,
      startDate: reservation.start_date,
      endDate: reservation.end_date,
      totalPrice: toNumber(reservation.total_price),
      createdAt: reservation.created_at,
      revenueDA: toNumber(reservation.total_price),
    };
  });

  const filtered = statusFilter === 'ALL' ? items : items.filter((item) => item.status === statusFilter);

  return {
    agency: toAgencyDto(company, buildAgencyVerification({ company })),
    items: filtered,
    pagination: {
      page,
      limit,
      total: typeof count === 'number' ? count : filtered.length,
      totalPages: typeof count === 'number' ? Math.max(1, Math.ceil(count / limit)) : 1,
    },
    total: filtered.length,
  };
};
