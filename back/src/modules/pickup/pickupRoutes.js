import { Router } from 'express';
import { verifyClient } from '../../middleware/roles/verifyClient.js';
import { verifyOwner } from '../../middleware/roles/verifyOwner.js';
import {
  generatePickupCodeHandler,
  getPickupPayloadForRenterHandler,
  verifyPickupCodeHandler,
} from './pickupController.js';

const router = Router({ mergeParams: true });

// Renter generates payload (6-digit code + token)
/**
 * @openapi
 * /api/reservations/{id}/pickup/generate:
 *   post:
 *     tags: [Pickup]
 *     summary: Generate a pickup code and token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pickup payload generated
 */
router.post('/generate', verifyClient, generatePickupCodeHandler);

// Renter views whether payload exists + expiry (code itself is returned on generate for now)
/**
 * @openapi
 * /api/reservations/{id}/pickup/payload:
 *   get:
 *     tags: [Pickup]
 *     summary: Get pickup payload details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pickup payload
 */
router.get('/payload', verifyClient, getPickupPayloadForRenterHandler);

// Owner/staff verifies using manual code or qr token
/**
 * @openapi
 * /api/reservations/{id}/pickup/verify:
 *   post:
 *     tags: [Pickup]
 *     summary: Verify pickup code
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pickup verified
 */
router.post('/verify', verifyOwner, verifyPickupCodeHandler);

export default router;
