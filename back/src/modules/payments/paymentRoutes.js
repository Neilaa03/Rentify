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

/**
 * @openapi
 * /api/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Stripe webhook endpoint
 *     responses:
 *       200:
 *         description: Webhook processed
 * /api/payments/create-card-payment:
 *   post:
 *     tags: [Payments]
 *     summary: Create a card payment intent
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment intent created
 * /api/payments/connect/onboarding-link:
 *   post:
 *     tags: [Payments]
 *     summary: Create a Stripe Connect onboarding link
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding link created
 * /api/payments/connect/status/{ownerId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get Stripe Connect status for an owner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connect status
 * /api/payments/create-cash-payment:
 *   post:
 *     tags: [Payments]
 *     summary: Create a cash payment
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cash payment created
 * /api/payments/confirm-cash-payment:
 *   post:
 *     tags: [Payments]
 *     summary: Confirm a cash payment
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cash payment confirmed
 * /api/payments/status/{reservationId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment status for a reservation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status
 */
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
