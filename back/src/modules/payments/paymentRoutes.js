import { Router } from 'express';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import {
    createOwnerOnboardingLinkHandler,
    createCardPaymentIntentHandler,
    createCashPaymentHandler,
    handleStripeWebhook,
    confirmCashPaymentHandler,
    getOwnerConnectStatusHandler,
    getPaymentStatusHandler,
} from './paymentController.js';

const router = Router();

// Webhook route - no auth required (must be verified by Stripe signature)
router.post('/webhook', handleStripeWebhook);

// Card payment endpoint
router.post('/create-card-payment', authenticateToken, createCardPaymentIntentHandler);

// Owner Stripe Connect onboarding
router.post('/connect/onboarding-link', authenticateToken, requireRoles('owner', 'companyManager', 'admin'), createOwnerOnboardingLinkHandler);

// Stripe Connect status for a listing owner (used to enable/disable card payments)
router.get('/connect/status/:ownerId', authenticateToken, getOwnerConnectStatusHandler);

// Cash payment endpoint
router.post('/create-cash-payment', authenticateToken, createCashPaymentHandler);

// Owner confirms cash payment on pickup
router.post('/confirm-cash-payment', authenticateToken, confirmCashPaymentHandler);

// Get payment status
router.get('/status/:reservationId', authenticateToken, getPaymentStatusHandler);

export default router;
