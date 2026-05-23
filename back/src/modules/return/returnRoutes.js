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
router.post('/generate', verifyOwner, generateReturnCodeHandler);

// Owner views whether payload exists + expiry
router.get('/payload', verifyOwner, getReturnPayloadForOwnerHandler);

// Client verifies using manual code or qr token
router.post('/verify', verifyClient, verifyReturnCodeHandler);

export default router;

