import cloudinary from '../../config/cloudinary.js';

import {
  getCarDocuments,
  getCarDocumentById,
  createCarDocument,
  updateCarDocument,
  deleteCarDocument,
} from './carDocumentModel.js';

import {
  createCarDocumentSchema,
  updateCarDocumentSchema,
  idParamSchema,
  carIdParamSchema,
  carDocumentFiltersSchema,
  uploadCarDocumentBodySchema,
} from './carDocumentSchemas.js';

const zodErrors = (error) => error.issues.map((item) => item.message);
const getUploadedFile = (req) =>
  req.files?.document?.[0] ||
  req.files?.image?.[0] ||
  req.files?.file?.[0] ||
  null;

export const getAllCarDocuments = async (req, res) => {
  try {
    const parsedFilters = carDocumentFiltersSchema.parse({
      carId: req.query.carId,
      documentType: req.query.documentType,
      status: req.query.status,
    });
    const items = await getCarDocuments(parsedFilters);
    res.json(items);
  } catch (err) {
    if (err.issues) return res.status(400).json({ errors: zodErrors(err) });
    res.status(400).json({ error: err.message });
  }
};

export const getCarDocument = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const item = await getCarDocumentById(id);
    res.json(item);
  } catch (err) {
    if (err.issues) return res.status(400).json({ errors: zodErrors(err) });
    res.status(404).json({ error: err.message });
  }
};

export const getCarDocumentsByCarId = async (req, res) => {
  try {
    const { carId } = carIdParamSchema.parse(req.params);
    const items = await getCarDocuments({ carId });
    res.json(items);
  } catch (err) {
    if (err.issues) return res.status(400).json({ errors: zodErrors(err) });
    res.status(400).json({ error: err.message });
  }
};

export const createCarDocumentHandler = async (req, res) => {
  try {
    const payload = createCarDocumentSchema.parse(req.body);
    const item = await createCarDocument(payload);
    res.status(201).json(item);
  } catch (err) {
    if (err.issues) return res.status(400).json({ errors: zodErrors(err) });
    res.status(400).json({ error: err.message });
  }
};

export const uploadCarDocumentHandler = async (req, res) => {
  try {
    const uploadedFile = getUploadedFile(req);

    if (!uploadedFile) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    const base64 = uploadedFile.buffer.toString('base64');
    const dataURI = `data:${uploadedFile.mimetype};base64,${base64}`;

    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'rentify/car-documents',
    });

    return res.status(201).json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      resourceType: uploadResult.resource_type,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Upload failed',
      details: error.message,
    });
  }
};

export const uploadAndCreateCarDocumentHandler = async (req, res) => {
  try {
    const { carId } = carIdParamSchema.parse(req.params);
    const { documentType, status } = uploadCarDocumentBodySchema.parse(req.body);
    const uploadedFile = getUploadedFile(req);

    if (!uploadedFile) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    const base64 = uploadedFile.buffer.toString('base64');
    const dataURI = `data:${uploadedFile.mimetype};base64,${base64}`;

    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'rentify/car-documents',
    });

    const createdItem = await createCarDocument({
      carId,
      documentType,
      documentUrl: uploadResult.secure_url,
      status,
    });

    return res.status(201).json({
      ...createdItem,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    if (error.issues) return res.status(400).json({ errors: zodErrors(error) });
    return res.status(500).json({
      error: 'Upload and create failed',
      details: error.message,
    });
  }
};

export const updateCarDocumentHandler = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const payload = updateCarDocumentSchema.parse(req.body);
    const item = await updateCarDocument(id, payload);
    res.json(item);
  } catch (err) {
    if (err.issues) return res.status(400).json({ errors: zodErrors(err) });
    res.status(400).json({ error: err.message });
  }
};

export const deleteCarDocumentHandler = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await deleteCarDocument(id);
    res.sendStatus(204);
  } catch (err) {
    if (err.issues) return res.status(400).json({ errors: zodErrors(err) });
    res.status(400).json({ error: err.message });
  }
};
