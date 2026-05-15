import { Router } from 'express';
import upload from '../../middleware/upload.js';
import { authenticateToken } from '../../middleware/auth.js';
import { verifyDocumentActor } from '../../middleware/roles/verifyDocumentActor.js';
import {
  getAllDocuments,
  getDocument,
  createDocumentHandler,
  uploadDocumentHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
} from './documentController.js';

const router = Router();

const uploadDocumentFields = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

router.get('/', authenticateToken, verifyDocumentActor, getAllDocuments);
router.get('/:id', authenticateToken, verifyDocumentActor, getDocument);
router.post('/', authenticateToken, verifyDocumentActor, createDocumentHandler);
router.post('/upload', authenticateToken, verifyDocumentActor, uploadDocumentFields, uploadDocumentHandler);
router.put('/:id', authenticateToken, verifyDocumentActor, updateDocumentHandler);
router.patch( '/:id', authenticateToken, verifyDocumentActor, updateDocumentHandler,);
router.delete( '/:id', authenticateToken, verifyDocumentActor, deleteDocumentHandler,);

export default router;
