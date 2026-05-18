import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { createPaymentIntentHandler } from './paymentController.js';

const router = Router();

router.post('/create-payment-intent', authenticateToken, createPaymentIntentHandler);

export default router;
