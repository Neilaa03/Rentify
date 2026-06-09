import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { supabase } from '../../config/supabase.js';
import { getReservationById, updateReservationStatus } from '../reservations/reservationModel.js';

const PICKUP_TABLE = 'pickup';

const RETURN_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RETURN_MAX_ATTEMPTS = 5;

const getPepper = () => {
  const pepper = process.env.PICKUP_CODE_PEPPER || process.env.WPICKUP_CODE_PEPPER;
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

export const generateReturnPayload = async ({ reservationId }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.status !== 'return_pending') {
    throw new Error('Return code can only be generated when status is return_pending.');
  }

  const pickupRow = await getPickupRowByReservationId(reservationId);
  if (!pickupRow?.id) throw new Error('Pickup record not found for reservation.');
  if (pickupRow.return_verified_at) throw new Error('Return already verified.');

  const rawCode = String(Math.floor(100000 + Math.random() * 900000));
  const rawQrToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RETURN_CODE_TTL_MS).toISOString();
  const qrDataUrl = await QRCode.toDataURL(rawQrToken, { margin: 1, width: 420, errorCorrectionLevel: 'M' });

  const { error: updateError } = await supabase
    .from(PICKUP_TABLE)
    .update({
      return_code_hash: hashWithPepper(rawCode),
      return_qr_token_hash: hashWithPepper(rawQrToken),
      return_code_expires_at: expiresAt,
      return_attempts: 0,
      return_verified_at: null,
      return_verified_by: null,
    })
    .eq('id', pickupRow.id);

  if (updateError) throw updateError;

  return {
    reservationId,
    expiresAt,
    code: rawCode,
    qrToken: rawQrToken,
    qrDataUrl,
  };
};

export const getReturnPayloadStatus = async ({ reservationId }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) throw new Error('Reservation not found');

  const pickupRow = await getPickupRowByReservationId(reservationId);
  if (!pickupRow) throw new Error('Pickup record not found.');

  const hasPayload = Boolean(pickupRow.return_code_hash && pickupRow.return_code_expires_at);
  return {
    reservationId,
    reservationStatus: reservation.status,
    hasPayload,
    expiresAt: pickupRow.return_code_expires_at || null,
    verifiedAt: pickupRow.return_verified_at || null,
  };
};

export const verifyReturn = async ({ reservationId, verifierUserId, code, qrToken }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.status !== 'return_pending') {
    throw new Error('Return verification is only allowed when status is return_pending.');
  }

  const pickupRow = await getPickupRowByReservationId(reservationId);
  if (!pickupRow?.id) throw new Error('Pickup record not found.');
  if (pickupRow.return_verified_at) throw new Error('Return already verified.');

  const attempts = Number(pickupRow.return_attempts || 0);
  if (attempts >= RETURN_MAX_ATTEMPTS) throw new Error('Too many attempts. Return is locked.');

  const expiresMs = parseDbTimestampToMs(pickupRow.return_code_expires_at);
  if (!Number.isFinite(expiresMs) || Date.now() > expiresMs) {
    throw new Error('Return code expired.');
  }

  const usingCode = Boolean(code);
  const provided = usingCode ? String(code).trim() : String(qrToken || '').trim();
  const expectedHash = usingCode ? pickupRow.return_code_hash : pickupRow.return_qr_token_hash;
  if (!expectedHash) throw new Error('Return payload not generated yet.');

  const providedHash = hashWithPepper(provided);
  const ok = crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(expectedHash));

  if (!ok) {
    await supabase
      .from(PICKUP_TABLE)
      .update({ return_attempts: attempts + 1 })
      .eq('id', pickupRow.id);
    throw new Error('Invalid return code.');
  }

  const nowIso = new Date().toISOString();
  const { error: verifyError } = await supabase
    .from(PICKUP_TABLE)
    .update({
      return_verified_at: nowIso,
      return_verified_by: verifierUserId,
    })
    .eq('id', pickupRow.id);
  if (verifyError) throw verifyError;

  await updateReservationStatus(reservationId, 'finished');
  return { reservationId, verifiedAt: nowIso };
};
