import cloudinary from '../../config/cloudinary.js';

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
  carIdParamSchema,
  carImageFiltersSchema,
  uploadCarImageBodySchema,
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

export const getCarImagesByCarId = async (req, res) => {
  try {
    const { carId } = carIdParamSchema.parse(req.params);
    const items = await getCarImages({ carId });
    res.json(items);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
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

export const uploadCarImageHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    const base64 = req.file.buffer.toString('base64');

    const dataURI = `data:${req.file.mimetype};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'cars',
    });

    return res.status(200).json({
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Upload failed',
      details: error.message,
    });
  }
};

export const uploadAndCreateCarImageHandler = async (req, res) => {
  try {
    const { carId } = carIdParamSchema.parse(req.params);
    const { isPrimary } = uploadCarImageBodySchema.parse(req.body);

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    const base64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64}`;

    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'cars',
    });

    const createdItem = await createCarImage({
      carId,
      imageUrl: uploadResult.secure_url,
      isPrimary,
    });

    return res.status(201).json({
      ...createdItem,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    if (error.issues) {
      return res.status(400).json({ errors: zodErrors(error) });
    }
    return res.status(500).json({
      error: 'Upload and create failed',
      details: error.message,
    });
  }
};
