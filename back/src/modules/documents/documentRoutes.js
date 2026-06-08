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

/**
 * @openapi
 * /api/documents:
 *   get:
 *     tags: [Documents]
 *     summary: List documents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Documents list
 *   post:
 *     tags: [Documents]
 *     summary: Create a document
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document created
 */
router.get('/', authenticateToken, verifyDocumentActor, getAllDocuments);
/**
 * @openapi
 * /api/documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get a document
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
 *         description: Document
 *   put:
 *     tags: [Documents]
 *     summary: Replace a document
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document updated
 *   patch:
 *     tags: [Documents]
 *     summary: Update a document
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document patched
 *   delete:
 *     tags: [Documents]
 *     summary: Delete a document
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document deleted
 */
router.get('/:id', authenticateToken, verifyDocumentActor, getDocument);
router.post('/', authenticateToken, verifyDocumentActor, createDocumentHandler);
/**
 * @openapi
 * /api/documents/upload:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a document file
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document uploaded
 */
router.post('/upload', authenticateToken, verifyDocumentActor, uploadDocumentFields, uploadDocumentHandler);
router.put('/:id', authenticateToken, verifyDocumentActor, updateDocumentHandler);
router.patch( '/:id', authenticateToken, verifyDocumentActor, updateDocumentHandler,);
router.delete( '/:id', authenticateToken, verifyDocumentActor, deleteDocumentHandler,);

export default router;
