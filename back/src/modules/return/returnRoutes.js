import { Router } from 'express';
import { verifyClient } from '../../middleware/roles/verifyClient.js';
import { verifyOwner } from '../../middleware/roles/verifyOwner.js';
import {
  generateReturnCodeHandler,
  getReturnPayloadForOwnerHandler,
  verifyReturnCodeHandler,
} from './returnController.js';

const router = Router({ mergeParams: true });

// Owner generates payload (6-digit code + token)
/**
 * @openapi
 * /api/reservations/{id}/return/generate:
 *   post:
 *     tags: [Return]
 *     summary: Generate a return code and token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Return payload generated
 */
router.post('/generate', verifyOwner, generateReturnCodeHandler);

// Owner views whether payload exists + expiry
/**
 * @openapi
 * /api/reservations/{id}/return/payload:
 *   get:
 *     tags: [Return]
 *     summary: Get return payload details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Return payload
 */
router.get('/payload', verifyOwner, getReturnPayloadForOwnerHandler);

// Client verifies using manual code or qr token
/**
 * @openapi
 * /api/reservations/{id}/return/verify:
 *   post:
 *     tags: [Return]
 *     summary: Verify return code
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Return verified
 */
router.post('/verify', verifyClient, verifyReturnCodeHandler);

export default router;
