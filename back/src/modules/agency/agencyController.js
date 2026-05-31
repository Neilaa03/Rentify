import {
  getAgencyByManagerId,
  getAgencyDashboard,
  getAgencyDocuments,
  getAgencyRequests,
  getAgencyVehicles,
  toggleAgencyVehicleVisibility,
} from './agencyModel.js';
import { uploadDocumentHandler } from '../documents/documentController.js';

const zodErrors = (error) => error.issues.map((item) => item.message);

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
    req.body = {
      ...req.body,
      companyId: agency.id,
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
