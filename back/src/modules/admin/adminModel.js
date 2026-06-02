import { supabase } from '../../config/supabase.js';
import { stripe } from '../payments/paymentModel.js';
import { createNotification } from '../notifications/notificationModel.js';

const withPagination = (query, page = 1, limit = 20) => query.range((page - 1) * limit, page * limit - 1);

const getDocumentTimestamp = (doc) => new Date(doc?.updated_at || doc?.created_at || 0).getTime();

const dedupeDocumentsByType = (documents = []) => {
  const latestByType = new Map();

  for (const doc of documents) {
    const type = String(doc?.document_type || '').trim() || 'document';
    const existing = latestByType.get(type);
    if (!existing || getDocumentTimestamp(doc) >= getDocumentTimestamp(existing)) {
      latestByType.set(type, doc);
    }
  }

  return [...latestByType.values()].sort((a, b) => getDocumentTimestamp(b) - getDocumentTimestamp(a));
};

export const getDashboardMetrics = async () => {
  const [users, cars, reservations, payments, pendingCars, recentReservations] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
    supabase.from('cars').select('id', { count: 'exact', head: true }),
    supabase.from('reservations').select('id', { count: 'exact', head: true }),
    supabase.from('payments').select('amount,status,created_at').in('status', ['completed', 'paid']).order('created_at', { ascending: false }),
    supabase.from('cars').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabase.from('reservations').select('status,total_price,created_at').order('created_at', { ascending: false }).limit(10),
  ]);

  const totalRevenue = (payments.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const reservationStats = (recentReservations.data || []).reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totals: {
      users: users.count || 0,
      cars: cars.count || 0,
      reservations: reservations.count || 0,
      revenue: Number(totalRevenue.toFixed(2)),
      pendingCarApprovals: pendingCars.count || 0,
    },
    reservationStats,
    recentActivity: (recentReservations.data || []).map((r) => ({
      type: 'Reservation',
      status: r.status,
      amount: r.total_price,
      at: r.created_at,
    })),
  };
};

export const getUsers = async ({ page, limit, search, role, isActive }) => {
  let query = supabase.from('users').select('*', { count: 'exact' }).neq('role', 'admin').order('created_at', { ascending: false });
  if (search) query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  if (role) query = query.eq('role', role);
  if (typeof isActive === 'boolean') query = query.eq('is_active', isActive);

  const { data, count, error } = await withPagination(query, page, limit);
  if (error) throw error;
  return { data: data || [], count: count || 0 };
};

export const updateUser = async (userId, payload) => {
  const mapped = {};
  if (payload.role !== undefined) mapped.role = payload.role;
  if (payload.isActive !== undefined) mapped.is_active = payload.isActive;

  const { data, error } = await supabase.from('users').update(mapped).eq('id', userId).neq('role', 'admin').select('*').single();
  if (error) throw error;
  return data;
};

export const getUserDetails = async (userId) => {
  const [userRes, reservationsRes, paymentsRes, docsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).neq('role', 'admin').single(),
    supabase.from('reservations').select('*').eq('renter_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('payments').select('*, reservations!inner(renter_id)').eq('reservations.renter_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  if (userRes.error) throw userRes.error;

  const docs = dedupeDocumentsByType(docsRes.data || []);
  const documentIds = docs.map((doc) => doc.id).filter(Boolean);
  const { data: ocrResults } = documentIds.length
    ? await supabase
      .from('document_ocr_results')
      .select('*')
      .in('document_id', documentIds)
    : { data: [] };
  const ocrByDocumentId = Object.fromEntries((ocrResults || []).map((row) => [row.document_id, row]));

  return {
    user: userRes.data,
    reservations: reservationsRes.data || [],
    payments: paymentsRes.data || [],
    documents: (docs || []).map((doc) => ({
      ...doc,
      ocr_result: ocrByDocumentId[doc.id] || null,
    })),
  };
};

export const getCars = async ({ page, limit, search, approvalStatus, hidden }) => {
  let query = supabase.from('cars').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (search) query = query.or(`brand.ilike.%${search}%,model.ilike.%${search}%,registration_number.ilike.%${search}%`);
  if (approvalStatus) query = query.eq('approval_status', approvalStatus);
  if (typeof hidden === 'boolean') query = query.eq('is_hidden', hidden);

  const { data, count, error } = await withPagination(query, page, limit);
  if (error) throw error;

  const ownerIds = [...new Set((data || []).map((c) => c.owner_id).filter(Boolean))];
  const { data: owners } = ownerIds.length
    ? await supabase.from('users').select('id,email,first_name,last_name,role').in('id', ownerIds)
    : { data: [] };
  const { data: companies } = ownerIds.length
    ? await supabase.from('company').select('id,manager_id,company_name,company_email,registration_number').in('manager_id', ownerIds)
    : { data: [] };

  const ownerMap = Object.fromEntries((owners || []).map((u) => [u.id, u]));
  const companyMap = Object.fromEntries((companies || []).map((c) => [c.manager_id, c]));

  return {
    data: (data || []).map((car) => ({
      ...car,
      owner: ownerMap[car.owner_id] || null,
      company: companyMap[car.owner_id] || null,
    })),
    count: count || 0,
  };
};

export const getCarDetails = async (carId) => {
  const [{ data: car, error: carError }, { data: docs }, { data: listings }] = await Promise.all([
    supabase.from('cars').select('*').eq('id', carId).single(),
    supabase.from('documents').select('*').eq('car_id', carId).order('created_at', { ascending: false }),
    supabase.from('listings').select('id,title,is_active,city,country').eq('car_id', carId).order('created_at', { ascending: false }),
  ]);

  if (carError) throw carError;

  const { data: owner } = await supabase.from('users').select('id,email,first_name,last_name,role,is_verified').eq('id', car.owner_id).single();
  const { data: company } = await supabase.from('company').select('*').eq('manager_id', car.owner_id).maybeSingle();
  const documentIds = (docs || []).map((doc) => doc.id).filter(Boolean);
  const { data: ocrResults } = documentIds.length
    ? await supabase
      .from('document_ocr_results')
      .select('*')
      .in('document_id', documentIds)
    : { data: [] };

  const ocrByDocumentId = Object.fromEntries((ocrResults || []).map((row) => [row.document_id, row]));
<<<<<<< HEAD
  const documents = (docs || []).map((doc) => ({
=======
  const documents = dedupeDocumentsByType(docs || []).map((doc) => ({
>>>>>>> dev
    ...doc,
    ocr_result: ocrByDocumentId[doc.id] || null,
  }));

  return { car, owner: owner || null, company: company || null, documents, listings: listings || [] };
};

export const updateCarModeration = async (carId, payload) => {
  if (payload.approvalStatus === 'approved') {
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('document_type,status')
      .eq('car_id', carId);

    if (docsError) throw docsError;

    const required = ['carte_grise', 'insurance', 'technical_control'];
    const approvedByType = new Set((docs || []).filter((d) => d.status === 'approved').map((d) => d.document_type));
    const missing = required.filter((t) => !approvedByType.has(t));
    if (missing.length) {
      throw new Error(`Cannot approve car until required documents are approved: ${missing.join(', ')}`);
    }
  }

  const mapped = {};
  if (payload.approvalStatus !== undefined) mapped.approval_status = payload.approvalStatus;
  if (payload.isHidden !== undefined) mapped.is_hidden = payload.isHidden;

  const { data, error } = await supabase.from('cars').update(mapped).eq('id', carId).select('*').single();
  if (error) throw error;
  return data;
};

export const getReservations = async ({ page, limit, status, ownerId, companyId }) => {
  let query = supabase.from('reservations').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, count, error } = await withPagination(query, page, limit);
  if (error) throw error;

  const listingIds = [...new Set((data || []).map((r) => r.listing_id).filter(Boolean))];
  const { data: listings } = listingIds.length
    ? await supabase.from('listings').select('id,title,car_id,city,country').in('id', listingIds)
    : { data: [] };

  const carIds = [...new Set((listings || []).map((l) => l.car_id).filter(Boolean))];
  const { data: cars } = carIds.length
    ? await supabase.from('cars').select('id,owner_id,brand,model,registration_number').in('id', carIds)
    : { data: [] };

  const ownerIds = [...new Set((cars || []).map((c) => c.owner_id).filter(Boolean))];
  const { data: owners } = ownerIds.length
    ? await supabase.from('users').select('id,email,first_name,last_name,role').in('id', ownerIds)
    : { data: [] };
  const { data: companies } = ownerIds.length
    ? await supabase.from('company').select('id,manager_id,company_name,company_email,registration_number').in('manager_id', ownerIds)
    : { data: [] };

  const listingMap = Object.fromEntries((listings || []).map((l) => [l.id, l]));
  const carMap = Object.fromEntries((cars || []).map((c) => [c.id, c]));
  const ownerMap = Object.fromEntries((owners || []).map((o) => [o.id, o]));
  const companyMap = Object.fromEntries((companies || []).map((c) => [c.manager_id, c]));

  let enriched = (data || []).map((r) => {
    const listing = listingMap[r.listing_id] || null;
    const car = listing?.car_id ? carMap[listing.car_id] : null;
    const owner = car?.owner_id ? ownerMap[car.owner_id] : null;
    const company = car?.owner_id ? companyMap[car.owner_id] : null;
    return { ...r, listing, car, owner, company };
  });

  if (ownerId) enriched = enriched.filter((r) => r.owner?.id === ownerId);
  if (companyId) enriched = enriched.filter((r) => r.company?.id === companyId);

  return { data: enriched, count: count || 0 };
};

export const getReservationDetails = async (reservationId) => {
  const { data: reservation, error } = await supabase.from('reservations').select('*').eq('id', reservationId).single();
  if (error) throw error;

  const [{ data: listing }, { data: renter }, { data: payment }, { data: pickup }] = await Promise.all([
    supabase.from('listings').select('*').eq('id', reservation.listing_id).single(),
    supabase.from('users').select('id,email,first_name,last_name,phone').eq('id', reservation.renter_id).single(),
    supabase.from('payments').select('*').eq('reservation_id', reservationId).maybeSingle(),
    supabase.from('pickup').select('*').eq('reservation_id', reservationId).maybeSingle(),
  ]);

  const { data: car } = listing?.car_id ? await supabase.from('cars').select('*').eq('id', listing.car_id).single() : { data: null };
  const { data: owner } = car?.owner_id ? await supabase.from('users').select('id,email,first_name,last_name,phone,role,is_verified').eq('id', car.owner_id).single() : { data: null };
  const { data: company } = car?.owner_id ? await supabase.from('company').select('*').eq('manager_id', car.owner_id).maybeSingle() : { data: null };
  const { data: ownerDocs } = car?.owner_id ? await supabase.from('documents').select('*').eq('user_id', car.owner_id).order('created_at', { ascending: false }) : { data: [] };
  const { data: carDocs } = car?.id ? await supabase.from('documents').select('*').eq('car_id', car.id).order('created_at', { ascending: false }) : { data: [] };
  const ownerDocIds = (ownerDocs || []).map((doc) => doc.id).filter(Boolean);
  const carDocIds = (carDocs || []).map((doc) => doc.id).filter(Boolean);
  const allDocIds = [...new Set([...ownerDocIds, ...carDocIds])];
  const { data: ocrResults } = allDocIds.length
    ? await supabase.from('document_ocr_results').select('*').in('document_id', allDocIds)
    : { data: [] };
  const ocrByDocumentId = Object.fromEntries((ocrResults || []).map((row) => [row.document_id, row]));
<<<<<<< HEAD
  const ownerDocuments = (ownerDocs || []).map((doc) => ({ ...doc, ocr_result: ocrByDocumentId[doc.id] || null }));
  const carDocuments = (carDocs || []).map((doc) => ({ ...doc, ocr_result: ocrByDocumentId[doc.id] || null }));
=======
  const ownerDocuments = dedupeDocumentsByType(ownerDocs || []).map((doc) => ({ ...doc, ocr_result: ocrByDocumentId[doc.id] || null }));
  const carDocuments = dedupeDocumentsByType(carDocs || []).map((doc) => ({ ...doc, ocr_result: ocrByDocumentId[doc.id] || null }));
>>>>>>> dev

  return { reservation, listing: listing || null, renter: renter || null, car: car || null, owner: owner || null, company: company || null, payment: payment || null, pickup: pickup || null, ownerDocuments, carDocuments };
};

export const suspendReservation = async (reservationId, reason = 'Reservation suspended by admin review') => {
  const details = await getReservationDetails(reservationId);
  const { reservation, renter, owner, listing } = details;

  const { data, error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', reservationId).select('*').single();
  if (error) throw error;

  const title = listing?.title || 'your reservation';
  if (renter?.id) {
    await createNotification({
      userId: renter.id,
      type: 'admin_reservation_suspension',
      title: 'Reservation suspended',
      message: `Your reservation for ${title} was suspended by admin. Reason: ${reason}.`,
      data: { reservationId },
    });
  }
  if (owner?.id) {
    await createNotification({
      userId: owner.id,
      type: 'admin_reservation_suspension',
      title: 'Reservation suspended',
      message: `A reservation on your listing ${title} was suspended by admin. You may request reactivation from support.`,
      data: { reservationId },
    });
  }

  return data;
};

export const getPayments = async ({ page, limit, status }) => {
  let query = supabase.from('payments').select('*, reservations(id, renter_id, listing_id, total_price)', { count: 'exact' }).order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, count, error } = await withPagination(query, page, limit);
  if (error) throw error;

  const analytics = {
    failed: (data || []).filter((p) => p.status === 'failed').length,
    completed: (data || []).filter((p) => ['completed', 'paid'].includes(p.status)).length,
    grossRevenue: Number((data || []).filter((p) => ['completed', 'paid'].includes(p.status)).reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)),
  };

  return { data: data || [], count: count || 0, analytics };
};

export const refundPayment = async ({ paymentId, amount, reason }) => {
  const { data: payment, error } = await supabase.from('payments').select('*').eq('id', paymentId).single();
  if (error || !payment) throw new Error('Payment not found');

  if (payment.status !== 'completed' && payment.status !== 'paid') throw new Error('Only completed payments can be refunded');

  if (stripe && payment.transaction_reference) {
    await stripe.refunds.create({
      payment_intent: payment.transaction_reference,
      ...(amount ? { amount: Math.round(Number(amount) * 100) } : {}),
      metadata: { reason },
    });
  }

  const { data: updated, error: updateError } = await supabase.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', paymentId).select('*').single();

  if (updateError) throw updateError;
  await supabase.from('reservations').update({ status: 'refunded' }).eq('id', payment.reservation_id);
  return updated;
};

export const getReports = async ({ page, limit, status }) => {
  let query = supabase.from('reports').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, count, error } = await withPagination(query, page, limit);
  if (error) throw error;
  return { data: data || [], count: count || 0 };
};

export const updateReportStatus = async (reportId, nextStatus) => {
  const { data, error } = await supabase.from('reports').update({ status: nextStatus }).eq('id', reportId).select('*').single();
  if (error) throw error;
  return data;
};
