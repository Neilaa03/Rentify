import {
  getCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
} from './carModel.js';

import {
  createCarSchema,
  updateCarSchema,
  idParamSchema,
  carFiltersSchema,
} from './carSchemas.js';

import { getCarImages } from '../car-images/carImageModel.js';
import { getDocuments } from '../documents/documentModel.js';

const zodErrors = (error) => error.issues.map((item) => item.message);

export const getAllCars = async (req, res) => {
  try {
    const parsedFilters = carFiltersSchema.parse({
      search: req.query.search || req.query.q,
    });
    const items = await getCars(parsedFilters);
    res.json(items);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const getMyCars = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const cars = await getCars({});
    
    // Filter cars for this owner
    const myCars = cars.filter(car => car.ownerId === ownerId);
    
    // Enrich each car with images and documents
    const enrichedCars = await Promise.all(
      myCars.map(async (car) => {
        try {
          const images = await getCarImages({ carId: car.id });
          const documents = await getDocuments({ carId: car.id });
          
          return {
            ...car,
            images,
            documents,
          };
        } catch (_error) {
          // If there's an error fetching images/docs, return car without them
          return {
            ...car,
            images: [],
            documents: [],
          };
        }
      })
    );
    
    res.json(enrichedCars);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const getCar = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const item = await getCarById(id);
    res.json(item);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(404).json({ error: err.message });
  }
};

export const createCarHandler = async (req, res) => {
  try {
    const payload = createCarSchema.parse({
      ...req.body,
      ownerId: req.user.id,
    });
    const item = await createCar(payload);
    res.status(201).json(item);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const updateCarHandler = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const existingCar = await getCarById(id);
    if (req.user.role !== 'admin' && existingCar.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own cars' });
    }

    const payload = updateCarSchema.parse(req.body);
    delete payload.ownerId;
    const item = await updateCar(id, payload);
    res.json(item);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const deleteCarHandler = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const existingCar = await getCarById(id);
    if (req.user.role !== 'admin' && existingCar.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own cars' });
    }
    await deleteCar(id);
    res.sendStatus(204);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};
