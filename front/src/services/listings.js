import { fetchJson } from './api';

const toUiListing = (item) => ({
  id: item.id,
  brand: item.car?.brand || 'N/A',
  model: item.car?.model || 'N/A',
  year: item.car?.year || '-',
  category: item.title || 'Vehicule',
  city: item.city || '',
  image: `https://picsum.photos/seed/listing-${item.id}/900/600`,
  pricePerDay: item.pricePerDay ?? 0,
  available: Boolean(item.isActive),
  fuel: item.car?.fuelType || 'N/A',
  transmission: item.car?.transmission || 'N/A',
  seats: item.car?.seats || '-',
  mileageKm: item.car?.mileage || 0,
  rating: 4.8,
  reviewsCount: 0,
  description: item.description || '',
  owner: null,
});

export const getListings = async () => {
  try {
    console.log(' Fetching listings from API...');
    const data = await fetchJson('/api/listings?limit=50&sort_order=asc');
    
    if (!data.items) {
      console.warn('No items returned from API. Response:', data);
      return [];
    }
    
    const listings = (data.items || []).map(toUiListing);
    console.log(`Successfully loaded ${listings.length} listings`);
    return listings;
  } catch (error) {
    console.error(' Error fetching listings:', error.message, error);
    alert(`Failed to load listings: ${error.message}`);
    return [];
  }
};
