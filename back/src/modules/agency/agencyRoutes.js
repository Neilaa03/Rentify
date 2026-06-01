import { Router } from 'express';
import upload from '../../middleware/upload.js';
import { authenticateToken } from '../../middleware/auth.js';
import { verifyAgencyOwner } from '../../middleware/roles/verifyAgencyOwner.js';
import {
  getAgencyDashboardHandler,
  getAgencyDocumentsHandler,
  getAgencyProfileHandler,
  getAgencyRequestsHandler,
  getAgencyVehiclesHandler,
  toggleAgencyVehicleVisibilityHandler,
  uploadAgencyDocumentHandler,
} from './agencyController.js';

const router = Router();

const uploadDocumentFields = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

router.use(authenticateToken, verifyAgencyOwner);

router.get('/dashboard', getAgencyDashboardHandler);
router.get('/documents', getAgencyDocumentsHandler);
router.post('/documents/upload', uploadDocumentFields, uploadAgencyDocumentHandler);
router.get('/vehicles', getAgencyVehiclesHandler);
router.patch('/vehicles/:id/visibility', toggleAgencyVehicleVisibilityHandler);
router.get('/requests', getAgencyRequestsHandler);
router.get('/profile', getAgencyProfileHandler);

export default router;
