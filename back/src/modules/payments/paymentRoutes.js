import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
    createCardPaymentIntentHandler,
    createCashPaymentHandler,
    handleStripeWebhook,
    confirmCashPaymentHandler,
    getPaymentStatusHandler,
} from './paymentController.js';

const router = Router();

// Webhook route - no auth required (must be verified by Stripe signature)
router.post('/webhook', handleStripeWebhook);

// Card payment endpoint
router.post('/create-card-payment', authenticateToken, createCardPaymentIntentHandler);

// Cash payment endpoint
router.post('/create-cash-payment', authenticateToken, createCashPaymentHandler);

// Owner confirms cash payment on pickup
router.post('/confirm-cash-payment', authenticateToken, confirmCashPaymentHandler);

// Get payment status
router.get('/status/:reservationId', authenticateToken, getPaymentStatusHandler);

export default router;

