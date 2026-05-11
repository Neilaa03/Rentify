import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
} from './listingModel.js';
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
    const payload = updateListingSchema.parse(req.body);
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
