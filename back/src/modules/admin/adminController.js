import {
  paginationSchema,
  userUpdateSchema,
  carModerationSchema,
  refundSchema,
} from './adminSchemas.js';
import {
  getDashboardMetrics,
  getUsers,
  updateUser,
  getUserDetails,
  getCars,
  getCarDetails,
  getAgencyDocuments,
  updateCarModeration,
  getReservations,
  getReservationDetails,
  suspendReservation,
  getPayments,
  refundPayment,
  getReports,
  updateReportStatus,
} from './adminModel.js';

const handle = (res, error) => res.status(400).json({ error: error.message || 'Request failed' });

export const dashboardHandler = async (_req, res) => {
  try {
    res.json(await getDashboardMetrics());
  } catch (error) {
    handle(res, error);
  }
};

export const listUsersHandler = async (req, res) => {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const data = await getUsers({ page, limit, search, role: req.query.role, isActive: req.query.isActive === undefined ? undefined : req.query.isActive === 'true' });
    res.json(data);
  } catch (error) {
    handle(res, error);
  }
};

export const updateUserHandler = async (req, res) => {
  try {
    const payload = userUpdateSchema.parse(req.body);
    const user = await updateUser(req.params.userId, payload);
    res.json({ user });
  } catch (error) {
    handle(res, error);
  }
};

export const userDetailsHandler = async (req, res) => {
  try {
    const details = await getUserDetails(req.params.userId);
    res.json(details);
  } catch (error) {
    handle(res, error);
  }
};

export const listCarsHandler = async (req, res) => {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const data = await getCars({
      page,
      limit,
      search,
      approvalStatus: req.query.approvalStatus,
      hidden: req.query.hidden === undefined ? undefined : req.query.hidden === 'true',
    });
    res.json(data);
  } catch (error) {
    handle(res, error);
  }
};

export const carDetailsHandler = async (req, res) => {
  try {
    const data = await getCarDetails(req.params.carId);
    res.json(data);
  } catch (error) {
    handle(res, error);
  }
};

export const agencyDocumentsHandler = async (req, res) => {
  try {
    const { search } = req.query;
    const data = await getAgencyDocuments({ search });
    res.json(data);
  } catch (error) {
    handle(res, error);
  }
};

export const updateCarHandler = async (req, res) => {
  try {
    const payload = carModerationSchema.parse(req.body);
    const car = await updateCarModeration(req.params.carId, payload);
    res.json({ car });
  } catch (error) {
    handle(res, error);
  }
};

export const listReservationsHandler = async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const data = await getReservations({ page, limit, status: req.query.status, ownerId: req.query.ownerId, companyId: req.query.companyId });
    res.json(data);
  } catch (error) {
    handle(res, error);
  }
};

export const reservationDetailsHandler = async (req, res) => {
  try {
    const data = await getReservationDetails(req.params.reservationId);
    res.json(data);
  } catch (error) {
    handle(res, error);
  }
};

export const suspendReservationHandler = async (req, res) => {
  try {
    const reservation = await suspendReservation(req.params.reservationId, req.body?.reason);
    res.json({ reservation });
  } catch (error) {
    handle(res, error);
  }
};

export const listPaymentsHandler = async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const data = await getPayments({ page, limit, status: req.query.status });
    res.json(data);
  } catch (error) {
    handle(res, error);
  }
};

export const refundPaymentHandler = async (req, res) => {
  try {
    const payload = refundSchema.parse(req.body);
    const payment = await refundPayment(payload);
    res.json({ payment });
  } catch (error) {
    handle(res, error);
  }
};

export const listReportsHandler = async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const data = await getReports({ page, limit, status: req.query.status });
    res.json(data);
  } catch (error) {
    handle(res, error);
  }
};

export const updateReportHandler = async (req, res) => {
  try {
    const report = await updateReportStatus(req.params.reportId, req.body.status);
    res.json({ report });
  } catch (error) {
    handle(res, error);
  }
};
