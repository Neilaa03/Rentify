import { Router } from 'express';
import upload from '../../middleware/upload.js';
import {
  getAllCarDocuments,
  getCarDocument,
  getCarDocumentsByCarId,
  createCarDocumentHandler,
  uploadCarDocumentHandler,
  uploadAndCreateCarDocumentHandler,
  updateCarDocumentHandler,
  deleteCarDocumentHandler,
} from './carDocumentController.js';

const router = Router();
const uploadDocumentFields = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

router.get('/', getAllCarDocuments);
router.get('/car/:carId', getCarDocumentsByCarId);
router.post('/upload', uploadDocumentFields, uploadCarDocumentHandler);
router.post('/car/:carId/upload', uploadDocumentFields, uploadAndCreateCarDocumentHandler);
router.get('/:id', getCarDocument);
router.post('/', createCarDocumentHandler);
router.put('/:id', updateCarDocumentHandler);
router.patch('/:id', updateCarDocumentHandler);
router.delete('/:id', deleteCarDocumentHandler);

export default router;
