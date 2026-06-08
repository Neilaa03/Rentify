import { Router } from 'express';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import {
  dashboardHandler,
  listUsersHandler,
  updateUserHandler,
  userDetailsHandler,
  listCarsHandler,
  carDetailsHandler,
  agencyDocumentsHandler,
  updateCarHandler,
  listReservationsHandler,
  reservationDetailsHandler,
  suspendReservationHandler,
  listPaymentsHandler,
  refundPaymentHandler,
  listReportsHandler,
  updateReportHandler,
} from './adminController.js';

const router = Router();

router.use(authenticateToken, requireRoles('admin'));

/**
 * @openapi
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users list
 * /api/admin/users/{userId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get user details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *   patch:
 *     tags: [Admin]
 *     summary: Update a user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User updated
 * /api/admin/cars:
 *   get:
 *     tags: [Admin]
 *     summary: List cars
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cars list
 * /api/admin/cars/{carId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get car details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car details
 *   patch:
 *     tags: [Admin]
 *     summary: Update a car
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Car updated
 * /api/admin/agency-documents:
 *   get:
 *     tags: [Admin]
 *     summary: List agency documents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agency documents
 * /api/admin/reservations:
 *   get:
 *     tags: [Admin]
 *     summary: List reservations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservations list
 * /api/admin/reservations/{reservationId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get reservation details
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
 *         description: Reservation details
 * /api/admin/reservations/{reservationId}/suspend:
 *   post:
 *     tags: [Admin]
 *     summary: Suspend a reservation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservation suspended
 * /api/admin/payments:
 *   get:
 *     tags: [Admin]
 *     summary: List payments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payments list
 * /api/admin/payments/refund:
 *   post:
 *     tags: [Admin]
 *     summary: Refund a payment
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment refunded
 * /api/admin/reports:
 *   get:
 *     tags: [Admin]
 *     summary: List reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reports list
 * /api/admin/reports/{reportId}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update a report
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report updated
 */
router.get('/dashboard', dashboardHandler);

router.get('/users', listUsersHandler);
router.get('/users/:userId', userDetailsHandler);
router.patch('/users/:userId', updateUserHandler);

router.get('/cars', listCarsHandler);
router.get('/cars/:carId', carDetailsHandler);
router.patch('/cars/:carId', updateCarHandler);
router.get('/agency-documents', agencyDocumentsHandler);

router.get('/reservations', listReservationsHandler);
router.get('/reservations/:reservationId', reservationDetailsHandler);
router.post('/reservations/:reservationId/suspend', suspendReservationHandler);

router.get('/payments', listPaymentsHandler);
router.post('/payments/refund', refundPaymentHandler);

router.get('/reports', listReportsHandler);
router.patch('/reports/:reportId', updateReportHandler);

export default router;
