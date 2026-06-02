import { fetchJson } from './api';

export const pickListingImage = (item) => {
  const images = item?.car?.images || [];
  const primaryImage = images.find((image) => image?.isPrimary && image?.imageUrl);
  if (primaryImage?.imageUrl) return primaryImage.imageUrl;

  const firstImage = images.find((image) => image?.imageUrl);
  if (firstImage?.imageUrl) return firstImage.imageUrl;

  return `https://picsum.photos/seed/listing-${item.id}/900/600`;
};

export const toUiListing = (item) => {
  const carImages = Array.isArray(item?.car?.images)
    ? item.car.images
        .map((image) => image?.imageUrl || image?.image_url || image?.url || null)
        .filter(Boolean)
    : [];

  return {
    id: item.id,
    carId: item.carId || item.car_id || item?.car?.id || null,
    brand: item.car?.brand || 'N/A',
    model: item.car?.model || 'N/A',
    year: item.car?.year || '-',
    category: item.title || 'Vehicule',
    title: item.title || 'Vehicule',
    city: item.city || '',
    country: item.country || '',
    image: pickListingImage(item),
    images: carImages,
    car: item.car || null,
    pricePerDay: item.pricePerDay ?? 0,
    pricePerWeek: item.pricePerWeek ?? 0,
    pricePerMonth: item.pricePerMonth ?? 0,
    pickupAddress: item.pickupAddress ?? item.pickup_address ?? '',
    deliveryFee: item.deliveryFee ?? item.delivery_fee ?? 0,
    available: Boolean(item.isActive),
    availableFrom: item.availableFrom ?? item.available_from ?? null,
    availableTo: item.availableTo ?? item.available_to ?? null,
    fuel: item.car?.fuelType || 'N/A',
    transmission: item.car?.transmission || 'N/A',
    seats: item.car?.seats || '-',
    mileageKm: item.car?.mileage || 0,
    rating: 4.8,
    reviewsCount: 0,
    description: item.description || '',
    owner: null,
  };
};

export const getListings = async () => {
  try {
    console.log(' Fetching listings from API...');
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const rawListings = [];

    do {
      const data = await fetchJson(`/api/listings?limit=${pageSize}&sort_order=asc&page=${page}`);

      if (!data.items) {
        console.warn('No items returned from API. Response:', data);
        return [];
      }

      rawListings.push(...data.items);
      totalPages = Number(data?.pagination?.totalPages || page);
      page += 1;
    } while (page <= totalPages);

    if (!rawListings.length) {
      return [];
    }

    const listings = rawListings.map(toUiListing);
    console.log(`Successfully loaded ${listings.length} listings`);
    return listings;
  } catch (error) {
    console.error(' Error fetching listings:', error.message, error);
    alert(`Failed to load listings: ${error.message}`);
    return [];
  }
};
