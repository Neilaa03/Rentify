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
router.post('/generate', verifyClient, generatePickupCodeHandler);

// Renter views whether payload exists + expiry (code itself is returned on generate for now)
router.get('/payload', verifyClient, getPickupPayloadForRenterHandler);

// Owner/staff verifies using manual code or qr token
router.post('/verify', verifyOwner, verifyPickupCodeHandler);

export default router;
