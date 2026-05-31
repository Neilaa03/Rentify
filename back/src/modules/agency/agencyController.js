import {
  getAgencyByManagerId,
  getAgencyDashboard,
  getAgencyDocuments,
  getAgencyRequests,
  getAgencyVehicles,
  toggleAgencyVehicleVisibility,
} from './agencyModel.js';
import { getDocuments } from '../documents/documentModel.js';
import { uploadDocumentHandler } from '../documents/documentController.js';

const zodErrors = (error) => error.issues.map((item) => item.message);
const USER_DOCUMENT_TYPES = new Set(['identity_card', 'passport', 'driver_license']);
const COMPANY_DOCUMENT_TYPES = new Set(['business_registration', 'nif', 'professional_insurance']);

const sendError = (res, err) => {
  if (err.issues) {
    return res.status(400).json({ errors: zodErrors(err) });
  }
  return res.status(400).json({ error: err.message || 'Request failed' });
};

export const getAgencyDashboardHandler = async (req, res) => {
  try {
    const data = await getAgencyDashboard(req.user.id);
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
};

export const getAgencyDocumentsHandler = async (req, res) => {
  try {
    const data = await getAgencyDocuments(req.user.id);
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
};

export const uploadAgencyDocumentHandler = async (req, res) => {
  try {
    const agency = await getAgencyByManagerId(req.user.id);
    const documentType = String(req.body?.documentType || '').trim();
    const existingDocuments = await getDocuments({
      ...(COMPANY_DOCUMENT_TYPES.has(documentType) ? { companyId: agency.id } : {}),
      ...(USER_DOCUMENT_TYPES.has(documentType) ? { userId: req.user.id } : {}),
      documentType,
    });
    const verifiedDocument = existingDocuments.find((document) => String(document.status || '').toLowerCase() === 'approved');

    if (verifiedDocument) {
      return res.status(409).json({
        error: 'This document is already verified and cannot be replaced.',
      });
    }

    req.body = {
      ...req.body,
      ...(COMPANY_DOCUMENT_TYPES.has(documentType) ? { companyId: agency.id } : {}),
      ...(USER_DOCUMENT_TYPES.has(documentType) ? { userId: req.user.id } : {}),
    };
    return uploadDocumentHandler(req, res);
  } catch (err) {
    return sendError(res, err);
  }
};

export const getAgencyVehiclesHandler = async (req, res) => {
  try {
    const data = await getAgencyVehicles(req.user.id, {
      status: req.query.status,
      documentStatus: req.query.documentStatus || req.query.document_status,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
};

export const toggleAgencyVehicleVisibilityHandler = async (req, res) => {
  try {
    const data = await toggleAgencyVehicleVisibility(req.user.id, req.params.id);
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
};

export const getAgencyRequestsHandler = async (req, res) => {
  try {
    const data = await getAgencyRequests(req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
    });
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
};

export const getAgencyProfileHandler = async (req, res) => {
  try {
    const data = await getAgencyByManagerId(req.user.id);
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
};
