import { Router } from 'express';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import {
  dashboardHandler,
  listUsersHandler,
  updateUserHandler,
  userDetailsHandler,
  listCarsHandler,
  carDetailsHandler,
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

router.get('/dashboard', dashboardHandler);

router.get('/users', listUsersHandler);
router.get('/users/:userId', userDetailsHandler);
router.patch('/users/:userId', updateUserHandler);

router.get('/cars', listCarsHandler);
router.get('/cars/:carId', carDetailsHandler);
router.patch('/cars/:carId', updateCarHandler);

router.get('/reservations', listReservationsHandler);
router.get('/reservations/:reservationId', reservationDetailsHandler);
router.post('/reservations/:reservationId/suspend', suspendReservationHandler);

router.get('/payments', listPaymentsHandler);
router.post('/payments/refund', refundPaymentHandler);

router.get('/reports', listReportsHandler);
router.patch('/reports/:reportId', updateReportHandler);

export default router;
