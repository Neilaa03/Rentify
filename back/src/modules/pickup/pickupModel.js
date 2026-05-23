import crypto from 'node:crypto';
import { supabase } from '../../config/supabase.js';
import { getReservationById, updateReservationStatus } from '../reservations/reservationModel.js';

const PICKUP_TABLE = 'pickup';

const PICKUP_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const PICKUP_MAX_ATTEMPTS = 5;

const getPepper = () => {
  const pepper = process.env.PICKUP_CODE_PEPPER;
  if (!pepper) {
    throw new Error('Missing PICKUP_CODE_PEPPER in environment variables.');
  }
  return pepper;
};

const sha256Hex = (value) => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const hashWithPepper = (value) => sha256Hex(`${getPepper()}::${String(value)}`);

const parseDbTimestampToMs = (value) => {
  if (!value) return NaN;
  const raw = String(value).trim();
  if (!raw) return NaN;

  // Supabase/Postgres `timestamp without time zone` often comes back without a timezone suffix.
  // Treat those as UTC to avoid server-local timezone skew causing immediate expiry.
  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(raw);
  const normalized = hasTimezone ? raw : `${raw}Z`;
  return Date.parse(normalized);
};

export const getPickupRowByReservationId = async (reservationId) => {
  const { data, error } = await supabase
    .from(PICKUP_TABLE)
    .select('*')
    .eq('reservation_id', reservationId)
    .limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
};

export const generatePickupPayload = async ({ reservationId }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.status !== 'pickup_pending') {
    throw new Error('Pickup code can only be generated when status is pickup_pending.');
  }

  const pickupRow = await getPickupRowByReservationId(reservationId);
  if (!pickupRow?.id) throw new Error('Pickup record not found for reservation.');
  if (pickupRow.pickup_verified_at) throw new Error('Pickup already verified.');

  const rawCode = String(Math.floor(100000 + Math.random() * 900000));
  const rawQrToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + PICKUP_CODE_TTL_MS).toISOString();

  const { error: updateError } = await supabase
    .from(PICKUP_TABLE)
    .update({
      pickup_code_hash: hashWithPepper(rawCode),
      pickup_qr_token_hash: hashWithPepper(rawQrToken),
      pickup_code_expires_at: expiresAt,
      pickup_attempts: 0,
      pickup_verified_at: null,
      pickup_verified_by: null,
    })
    .eq('id', pickupRow.id);

  if (updateError) throw updateError;

  return {
    reservationId,
    expiresAt,
    code: rawCode,
    qrToken: rawQrToken,
  };
};

export const getPickupPayloadStatus = async ({ reservationId }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.status !== 'pickup_pending') {
    throw new Error('Pickup payload is only available when status is pickup_pending.');
  }

  const pickupRow = await getPickupRowByReservationId(reservationId);
  if (!pickupRow) throw new Error('Pickup record not found.');

  const hasPayload = Boolean(pickupRow.pickup_code_hash && pickupRow.pickup_code_expires_at);
  return {
    reservationId,
    hasPayload,
    expiresAt: pickupRow.pickup_code_expires_at || null,
    verifiedAt: pickupRow.pickup_verified_at || null,
  };
};

export const verifyPickup = async ({ reservationId, verifierUserId, code, qrToken }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.status !== 'pickup_pending') {
    throw new Error('Pickup verification is only allowed when status is pickup_pending.');
  }

  const pickupRow = await getPickupRowByReservationId(reservationId);
  if (!pickupRow?.id) throw new Error('Pickup record not found.');
  if (pickupRow.pickup_verified_at) throw new Error('Pickup already verified.');

  const attempts = Number(pickupRow.pickup_attempts || 0);
  if (attempts >= PICKUP_MAX_ATTEMPTS) throw new Error('Too many attempts. Pickup is locked.');

  const expiresMs = parseDbTimestampToMs(pickupRow.pickup_code_expires_at);
  if (!Number.isFinite(expiresMs) || Date.now() > expiresMs) {
    throw new Error('Pickup code expired.');
  }

  const usingCode = Boolean(code);
  const provided = usingCode ? String(code).trim() : String(qrToken || '').trim();
  const expectedHash = usingCode ? pickupRow.pickup_code_hash : pickupRow.pickup_qr_token_hash;
  if (!expectedHash) throw new Error('Pickup payload not generated yet.');

  const providedHash = hashWithPepper(provided);
  const ok = crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(expectedHash));

  if (!ok) {
    await supabase
      .from(PICKUP_TABLE)
      .update({ pickup_attempts: attempts + 1 })
      .eq('id', pickupRow.id);
    throw new Error('Invalid pickup code.');
  }

  const nowIso = new Date().toISOString();
  const { error: verifyError } = await supabase
    .from(PICKUP_TABLE)
    .update({
      pickup_verified_at: nowIso,
      pickup_verified_by: verifierUserId,
    })
    .eq('id', pickupRow.id);
  if (verifyError) throw verifyError;

  await updateReservationStatus(reservationId, 'active');
  return { reservationId, verifiedAt: nowIso };
};
