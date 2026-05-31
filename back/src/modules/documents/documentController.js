import cloudinary from '../../config/cloudinary.js';
import { supabase } from '../../config/supabase.js';

import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
} from './documentModel.js';
import {
  getDocumentOcrResultByDocumentId,
  upsertDocumentOcrResult,
} from './documentOcrModel.js';

import {
  createDocumentSchema,
  updateDocumentSchema,
  idParamSchema,
  documentFiltersSchema,
  uploadDocumentBodySchema,
} from './documentSchema.js';
import { getCarById } from '../cars/carModel.js';
import { verifyDocumentImage } from './documentVerificationService.js';

// categorize document types 
const userDocuments = [
  'identity_card',
  'passport',
  'driver_license',
];

const carDocuments = [
  'carte_grise',
  'insurance',
  'technical_control',
];

const companyDocuments = [
  'business_registration',
  'nif',
  'professional_insurance',
];

const ensurePdfExtension = (name = 'document') => {
  const trimmed = String(name || 'document').trim();
  if (trimmed.toLowerCase().endsWith('.pdf')) return trimmed;
  return `${trimmed}.pdf`;
};

const getCloudinaryOcrUrl = (uploadUrl, mimeType) => {
  if (mimeType !== 'application/pdf') return uploadUrl;
  if (!uploadUrl) return uploadUrl;
  return uploadUrl.replace(/\.pdf(\?.*)?$/i, '.jpg$1');
};

const zodErrors = (error) => error.issues.map((item) => item.message);
const getUploadedFile = (req) =>
  req.files?.document?.[0] ||
  req.files?.image?.[0] ||
  req.files?.file?.[0] ||
  req.file ||
  null;

const getCompanyById = async (id) => {
  const { data, error } = await supabase
    .from('company')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error('Company not found');
  return data;
};

const canManageDocumentPayload = async (req, { userId, carId, companyId }) => {
  if (req.user?.role === 'admin') return true;
  if (!req.user?.id) return false;

  if (userId) return userId === req.user.id;

  if (carId) {
    const car = await getCarById(carId);
    return car.ownerId === req.user.id;
  }

  if (companyId) {
    const company = await getCompanyById(companyId);
    return company.manager_id === req.user.id;
  }

  return false;
};

const getCurrentIsoTimestamp = () => new Date().toISOString();

const buildDocumentReviewUpdate = (status) => ({
  status,
  reviewedAt: getCurrentIsoTimestamp(),
});

const buildOcrRecordPayload = (documentId, verificationResult) => ({
  documentId,
  status: verificationResult.status,
  ocrText: verificationResult.extractedText,
  extractedFullName: verificationResult.extractedFullName,
  extractedDocumentNumber: verificationResult.extractedDocumentNumber,
  extractedExpirationDate: verificationResult.extractedExpirationDate,
  confidenceScore: verificationResult.confidenceScore,
  verificationReason: verificationResult.verificationReason,
});

export const getAllDocuments = async (req, res) => {
  try {
    const parsedFilters = documentFiltersSchema.parse({
      userId: req.query.userId,
      carId: req.query.carId,
      companyId: req.query.companyId,
      documentType: req.query.documentType,
      status: req.query.status,
    });
    const items = await getDocuments(parsedFilters);

    if (req.user?.role === 'admin') {
      const enriched = await Promise.all(items.map(async (item) => ({
        ...item,
        ocrResult: await getDocumentOcrResultByDocumentId(item.id),
      })));
      return res.json(enriched);
    }

    const accessChecks = await Promise.all(
      items.map((item) => canManageDocumentPayload(req, item)),
    );
    const scopedItems = items.filter((_item, index) => accessChecks[index]);
    const enriched = await Promise.all(scopedItems.map(async (item) => ({
      ...item,
      ocrResult: await getDocumentOcrResultByDocumentId(item.id),
    })));

    return res.json(enriched);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const getDocument = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const item = await getDocumentById(id);
    const allowed = await canManageDocumentPayload(req, item);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied for this document' });
    }
    const ocrResult = await getDocumentOcrResultByDocumentId(item.id);
    res.json({
      ...item,
      ocrResult,
    });
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(404).json({ error: err.message });
  }
};

export const createDocumentHandler = async (req, res) => {
  try {
    const payload = createDocumentSchema.parse(req.body);
    const allowed = await canManageDocumentPayload(req, payload);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied for this document' });
    }
    const item = await createDocument(payload);
    res.status(201).json(item);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const uploadDocumentHandler = async (req, res) => {
  try {
    const parsedData = uploadDocumentBodySchema.parse(req.body);
    const {
      userId,
      carId,
      companyId,
      documentType,
    } = parsedData;

    const uploadedFile = getUploadedFile(req);

    if (!uploadedFile) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    // validate file mime type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(uploadedFile.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
      });
    }

    // validate document type and required associations

    // USER DOCUMENTS
    if (userDocuments.includes(documentType)) {
      if (!userId) {
        return res.status(400).json({
          error: 'userId is required for user documents',
        });
      }
    }
    // CAR DOCUMENTS
    if (carDocuments.includes(documentType)) {
      if (!carId) {
        return res.status(400).json({
          error: 'carId is required for car documents',
        });
      }
    }
    // COMPANY DOCUMENTS
    if (companyDocuments.includes(documentType)) {
      if (!companyId) {
        return res.status(400).json({
          error: 'companyId is required for company documents',
        });
      }
    }

    //ownership validation
    // car ownership
    const allowed = await canManageDocumentPayload(req, { userId, carId, companyId });
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied for this document' });
    }


    // upload to cloudinary
    const base64 = uploadedFile.buffer.toString('base64');

    const dataURI = `data:${uploadedFile.mimetype};base64,${base64}`;

    const resourceType = 'image';

    // const uploadResult = await cloudinary.uploader.upload(dataURI, {
    //   folder: 'rentify/documents',
    //   resource_type: resourceType,
    // });
    const isPdf = uploadedFile.mimetype === 'application/pdf';
    const fallbackName = isPdf ? 'document.pdf' : 'document';
    const originalName = uploadedFile.originalname || fallbackName;
    const normalizedOriginalName = isPdf ? ensurePdfExtension(originalName) : originalName;
    const imagePublicId = normalizedOriginalName.replace(/\.[^/.]+$/, '');
    const uploadPublicId = isPdf ? normalizedOriginalName : imagePublicId;

    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'rentify/documents',
      resource_type: resourceType,
      public_id: uploadPublicId,
      use_filename: false,
      unique_filename: true,
      filename_override: normalizedOriginalName,
      type: 'upload',
    });

    // insert in database 
    const createdDocument = await createDocument({
      userId,
      carId,
      companyId,
      documentType,
      documentUrl: uploadResult.secure_url,
    });

    let verificationResult = {
      status: 'manual_review',
      extractedText: '',
      extractedFullName: null,
      extractedDocumentNumber: null,
      extractedExpirationDate: null,
      confidenceScore: 0,
      verificationReason: 'OCR is not available for this file type.',
    };

    try {
      const ocrUrl = getCloudinaryOcrUrl(uploadResult.secure_url, uploadedFile.mimetype);
      verificationResult = await verifyDocumentImage(ocrUrl);
    } catch (ocrError) {
      verificationResult = {
        status: 'manual_review',
        extractedText: '',
        extractedFullName: null,
        extractedDocumentNumber: null,
        extractedExpirationDate: null,
        confidenceScore: 0,
        verificationReason: `OCR processing failed: ${ocrError.message}`,
      };
    }

    let ocrResult = null;
    let documentStatus = verificationResult.status;

    try {
      ocrResult = await upsertDocumentOcrResult(
        buildOcrRecordPayload(createdDocument.id, verificationResult),
      );
    } catch (ocrWriteError) {
      console.error('Document OCR write error:', ocrWriteError);
      documentStatus = 'manual_review';
    }

    let finalDocument = createdDocument;
    try {
      finalDocument = await updateDocument(
        createdDocument.id,
        buildDocumentReviewUpdate(documentStatus),
      );
    } catch (documentUpdateError) {
      console.error('Document status update error:', documentUpdateError);
    }

    return res.status(201).json({
      ...finalDocument,
      ocrResult,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    if (error.issues) {
      return res.status(400).json({
        errors: error.issues,
      });
    }
    return res.status(500).json({
      error: 'Document upload failed',
      details: error.message,
    });
  }
};


export const updateDocumentHandler = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const currentDocument = await getDocumentById(id);
    const allowed = await canManageDocumentPayload(req, currentDocument);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied for this document' });
    }
    const payload = updateDocumentSchema.parse(req.body);
    const isReviewStatus = ['approved', 'rejected', 'manual_review'].includes(payload.status);
    const reviewPayload = {
      ...payload,
      ...(isReviewStatus && !payload.reviewedAt ? { reviewedAt: getCurrentIsoTimestamp() } : {}),
      ...(req.user?.id && isReviewStatus && !payload.reviewedBy ? { reviewedBy: req.user.id } : {}),
    };
    const item = await updateDocument(id, reviewPayload);
    res.json(item);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};

export const deleteDocumentHandler = async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const currentDocument = await getDocumentById(id);
    const allowed = await canManageDocumentPayload(req, currentDocument);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied for this document' });
    }
    await deleteDocument(id);
    res.sendStatus(204);
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({ errors: zodErrors(err) });
    }
    res.status(400).json({ error: err.message });
  }
};
