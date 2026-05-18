import { fetchJson } from './api';

const REQUIRED_CAR_DOCS = ['carte_grise', 'insurance', 'technical_control'];

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const getListingState = ({ isActive, docsByType }) => {
  if (isActive) return 'published';

  const allApproved = REQUIRED_CAR_DOCS.every((docType) => docsByType[docType] === 'approved');
  if (allApproved) return 'ready_to_publish';

  return 'not_ready';
};

const stateLabelMap = {
  published: 'Publiée',
  ready_to_publish: 'Prête à publier',
  not_ready: 'Docs en attente',
};

const stateToneMap = {
  published: 'green',
  ready_to_publish: 'blue',
  not_ready: 'amber',
};

const normalizeListing = (item, docsByType) => {
  const state = getListingState({ isActive: Boolean(item?.isActive), docsByType });

  return {
    id: item.id,
    carId: item.carId,
    title: item.title || `${item?.car?.brand || ''} ${item?.car?.model || ''}`.trim() || 'Annonce',
    brand: item?.car?.brand || 'N/A',
    model: item?.car?.model || 'N/A',
    year: item?.car?.year || '-',
    city: item.city || '',
    country: item.country || '',
    pricePerDay: item.pricePerDay ?? 0,
    isActive: Boolean(item?.isActive),
    state,
    stateLabel: stateLabelMap[state],
    stateTone: stateToneMap[state],
    documents: docsByType,
    createdAt: item.createdAt,
    availableFrom: item.availableFrom,
    availableTo: item.availableTo,
    description: item.description || '',
  };
};

const toDocStatusMap = (docs = []) => {
  const map = {};
  for (const doc of docs) {
    map[doc.documentType] = doc.status;
  }
  return map;
};

export const getOwnerCars = async ({ token, ownerId }) => {
  const data = await fetchJson('/api/cars', {
    headers: authHeaders(token),
  });

  return (Array.isArray(data) ? data : []).filter((car) => car.ownerId === ownerId);
};

export const getOwnerListings = async ({ token, ownerId }) => {
  const data = await fetchJson('/api/listings?limit=100&sort_order=desc', {
    headers: authHeaders(token),
  });

  const rawListings = (data?.items || []).filter((item) => item?.car?.ownerId === ownerId);

  const uniqueCarIds = [...new Set(rawListings.map((item) => item.carId).filter(Boolean))];
  const docsByCar = {};

  await Promise.all(
    uniqueCarIds.map(async (carId) => {
      try {
        const docs = await fetchJson(`/api/documents?carId=${carId}`, {
          headers: authHeaders(token),
        });
        docsByCar[carId] = toDocStatusMap(docs);
      } catch (_error) {
        docsByCar[carId] = {};
      }
    })
  );

  return rawListings.map((item) => normalizeListing(item, docsByCar[item.carId] || {}));
};

export const getOwnerDashboardData = async ({ token, ownerId }) => {
  const [cars, listings] = await Promise.all([
    getOwnerCars({ token, ownerId }),
    getOwnerListings({ token, ownerId }),
  ]);

  const stats = {
    totalCars: cars.length,
    published: listings.filter((listing) => listing.state === 'published').length,
    readyToPublish: listings.filter((listing) => listing.state === 'ready_to_publish').length,
    pendingDocs: listings.filter((listing) => listing.state === 'not_ready').length,
    estimatedRevenueDA: listings
      .filter((listing) => listing.state === 'published')
      .reduce((sum, listing) => sum + Number(listing.pricePerDay || 0), 0),
  };

  const activity = [...listings]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: `${item.brand} ${item.model}`,
      stateLabel: item.stateLabel,
      stateTone: item.stateTone,
      pricePerDay: item.pricePerDay,
    }));

  return { stats, activity, listings };
};

export const createOwnerListing = async ({ token, payload }) =>
  fetchJson('/api/listings', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ ...payload, isActive: false }),
  });

export const updateOwnerListing = async ({ token, listingId, payload }) =>
  fetchJson(`/api/listings/${listingId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

export const deleteOwnerListing = async ({ token, listingId }) =>
  fetchJson(`/api/listings/${listingId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

export const toggleListingPublication = async ({ token, listingId, shouldPublish }) =>
  fetchJson(`/api/listings/${listingId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ isActive: shouldPublish }),
  });

export const createOwnerCar = async ({ token, payload }) =>
  fetchJson('/api/cars', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

export const updateOwnerCar = async ({ token, carId, payload }) =>
  fetchJson(`/api/cars/${carId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

export const deleteOwnerCar = async ({ token, carId }) =>
  fetchJson(`/api/cars/${carId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

export const createCarDocument = async ({ token, payload }) =>
  fetchJson('/api/documents', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

export const deleteDocument = async ({ token, documentId }) =>
  fetchJson(`/api/documents/${documentId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

export const createCarImage = async ({ token, payload }) =>
  fetchJson('/api/car-images', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

export const uploadCarDocument = async ({
  token,
  carId,
  documentType,
  file,
}) => {
  const formData = new FormData();

  formData.append('document', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  });

  formData.append('carId', String(carId));
  formData.append('documentType', documentType);

  console.log('Uploading document:', {
    carId,
    documentType,
    file,
  });

  return fetchJson('/api/documents/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
};

export const uploadCarImage = async ({ token, carId, file, isPrimary }) => {
  const formData = new FormData();
  formData.append('image', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  });
  if (isPrimary !== undefined) {
    formData.append('isPrimary', String(isPrimary));
  }

  return fetchJson(`/api/car-images/car/${carId}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
};
