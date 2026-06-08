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

/**
 * @openapi
 * /api/agency/dashboard:
 *   get:
 *     tags: [Agency]
 *     summary: Get agency dashboard metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 * /api/agency/documents:
 *   get:
 *     tags: [Agency]
 *     summary: Get agency documents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agency documents
 * /api/agency/documents/upload:
 *   post:
 *     tags: [Agency]
 *     summary: Upload an agency document
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agency document uploaded
 * /api/agency/vehicles:
 *   get:
 *     tags: [Agency]
 *     summary: List agency vehicles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agency vehicles
 * /api/agency/vehicles/{id}/visibility:
 *   patch:
 *     tags: [Agency]
 *     summary: Toggle vehicle visibility
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle visibility updated
 * /api/agency/requests:
 *   get:
 *     tags: [Agency]
 *     summary: List agency requests
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agency requests
 * /api/agency/profile:
 *   get:
 *     tags: [Agency]
 *     summary: Get agency profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agency profile
 */
router.get('/dashboard', getAgencyDashboardHandler);
router.get('/documents', getAgencyDocumentsHandler);
router.post('/documents/upload', uploadDocumentFields, uploadAgencyDocumentHandler);
router.get('/vehicles', getAgencyVehiclesHandler);
router.patch('/vehicles/:id/visibility', toggleAgencyVehicleVisibilityHandler);
router.get('/requests', getAgencyRequestsHandler);
router.get('/profile', getAgencyProfileHandler);

export default router;
