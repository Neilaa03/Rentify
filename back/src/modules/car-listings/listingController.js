import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
} from './listingModel.js';
import { getCarById } from '../cars/carModel.js';
import { hasApprovedDocument } from '../documents/documentModel.js';
import {
  createListingSchema,
  updateListingSchema,
  idParamSchema,
  listingFiltersSchema,
} from './listingSchemas.js';

const zodErrors = (error) => error.issues.map((item) => item.message);

export const getAllListings = async (req, res) => {
  try {
    console.log(' GET /api/listings request:', { query: req.query });
    
    const parsedFilters = listingFiltersSchema.parse({
      country: req.query.country,
      city: req.query.city,
      availableFrom: req.query.available_from,
      availableTo: req.query.available_to,
      minPrice: req.query.min_price,
      maxPrice: req.query.max_price,
      fuelType: req.query.fuel_type,
      transmission: req.query.transmission,
      seats: req.query.seats,
      brand: req.query.brand,
      year: req.query.year,
      north: req.query.north,
      south: req.query.south,
      east: req.query.east,
      west: req.query.west,
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sort_by,
      sortOrder: req.query.sort_order,
    });

    const result = await getListings(parsedFilters);
    console.log('Listings retrieved:', { count: result.data?.length || 0 });
    res.json(result);
  } catch (err) {
    console.error('getAllListings Error:', err.message, err);
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(500).json({ error: err.message || 'Failed to fetch listings' });
  }
};

export const getListing = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const item = await getListingById(id);
    res.json(item);
  } catch (err) {
    console.error('getListing Error:', err.message, err);
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(404).json({ error: err.message });
  }
};

export const createListingHandler = async (req, res) => {
  try {
    const payload = createListingSchema.parse(req.body);
    const car = await getCarById(payload.carId);
    if (req.user.role !== 'admin' && car.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only create listings for your own cars' });
    }
    if (req.user.role !== 'admin' && payload.isActive === true) {
      const hasIdentityCard = await hasApprovedDocument({
        userId: req.user.id,
        documentType: 'identity_card',
      });
      if (!hasIdentityCard) {
        return res.status(403).json({
          error: 'Upload and verify your identity card before publishing listings.',
        });
      }
    }
    const item = await createListing(payload);
    res.status(201).json(item);
  } catch (err) {
    console.error('createListingHandler Error:', err.message, err);
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const updateListingHandler = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const existingListing = await getListingById(id);
    if (req.user.role !== 'admin' && existingListing.car?.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own listings' });
    }

    const payload = updateListingSchema.parse(req.body);
    if (req.user.role !== 'admin' && payload.isActive === true) {
      const hasIdentityCard = await hasApprovedDocument({
        userId: req.user.id,
        documentType: 'identity_card',
      });
      if (!hasIdentityCard) {
        return res.status(403).json({
          error: 'Upload and verify your identity card before publishing listings.',
        });
      }
    }
    if (payload.carId && req.user.role !== 'admin') {
      const targetCar = await getCarById(payload.carId);
      if (targetCar.ownerId !== req.user.id) {
        return res.status(403).json({
          error: 'You can only move listing to one of your own cars',
        });
      }
    }
    const item = await updateListing(id, payload);
    res.json(item);
  } catch (err) {
    console.error('updateListingHandler Error:', err.message, err);
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const deleteListingHandler = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const existingListing = await getListingById(id);
    if (req.user.role !== 'admin' && existingListing.car?.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own listings' });
    }
    await deleteListing(id);
    res.sendStatus(204);
  } catch (err) {
    console.error('deleteListingHandler Error:', err.message, err);
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};
