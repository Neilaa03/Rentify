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
    const payload = createCarSchema.parse(req.body);
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
    const payload = updateCarSchema.parse(req.body);
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
    await deleteCar(id);
    res.sendStatus(204);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};
