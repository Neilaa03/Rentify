import {
  getCarImages,
  getCarImageById,
  createCarImage,
  updateCarImage,
  deleteCarImage,
} from './carImageModel.js';

import {
  createCarImageSchema,
  updateCarImageSchema,
  idParamSchema,
  carImageFiltersSchema,
} from './carImageSchemas.js';

const zodErrors = (error) => error.issues.map((item) => item.message);

export const getAllCarImages = async (req, res) => {
  try {
    const parsedFilters = carImageFiltersSchema.parse({
      carId: req.query.carId,
      isPrimary: req.query.isPrimary,
    });
    const items = await getCarImages(parsedFilters);
    res.json(items);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const getCarImage = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const item = await getCarImageById(id);
    res.json(item);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(404).json({ error: err.message });
  }
};

export const createCarImageHandler = async (req, res) => {
  try {
    const payload = createCarImageSchema.parse(req.body);
    const item = await createCarImage(payload);
    res.status(201).json(item);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const updateCarImageHandler = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const payload = updateCarImageSchema.parse(req.body);
    const item = await updateCarImage(id, payload);
    res.json(item);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const deleteCarImageHandler = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await deleteCarImage(id);
    res.sendStatus(204);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};
