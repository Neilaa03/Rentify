import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { supabase } from '../../config/supabase.js';
import { getReservationById, updateReservationStatus } from '../reservations/reservationModel.js';

const PICKUP_TABLE = 'pickup';
const CODE_TABLE = 'code';

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

const getReturnCodeRow = async (pickupId) => {
  const { data, error } = await supabase
    .from(CODE_TABLE)
    .select('*')
    .eq('pickup_id', pickupId)
    .eq('flow', 'return')
    .limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
};

const replaceReturnCodeRow = async ({ pickupId, codeHash, qrTokenHash, expiresAt }) => {
  const { error } = await supabase
    .from(CODE_TABLE)
    .upsert({
      pickup_id: pickupId,
      flow: 'return',
      code: codeHash,
      qr_token_hash: qrTokenHash,
      expires_at: expiresAt,
      attempts: 0,
      verified_at: null,
      verified_by: null,
    }, { onConflict: 'pickup_id,flow' });
  if (error) throw error;
};

export const generateReturnPayload = async ({ reservationId }) => {
  const reservation = await getReservationById(reservationId);
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.status !== 'return_pending') {
    throw new Error('Return code can only be generated when status is return_pending.');
  }

  const pickupRow = await getPickupRowByReservationId(reservationId);
  if (!pickupRow?.id) throw new Error('Pickup record not found for reservation.');

  const existingCodeRow = await getReturnCodeRow(pickupRow.id);
  if (existingCodeRow?.verified_at) throw new Error('Return already verified.');

  const rawCode = String(Math.floor(100000 + Math.random() * 900000));
  const rawQrToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RETURN_CODE_TTL_MS).toISOString();
  const qrDataUrl = await QRCode.toDataURL(rawQrToken, { margin: 1, width: 420, errorCorrectionLevel: 'M' });

  await replaceReturnCodeRow({
    pickupId: pickupRow.id,
    codeHash: hashWithPepper(rawCode),
    qrTokenHash: hashWithPepper(rawQrToken),
    expiresAt,
  });

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

  const codeRow = await getReturnCodeRow(pickupRow.id);
  const hasPayload = Boolean(codeRow?.code && codeRow?.expires_at);
  return {
    reservationId,
    reservationStatus: reservation.status,
    hasPayload,
    expiresAt: codeRow?.expires_at || null,
    verifiedAt: codeRow?.verified_at || null,
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

  const codeRow = await getReturnCodeRow(pickupRow.id);
  if (!codeRow) throw new Error('Return payload not generated yet.');
  if (codeRow.verified_at) throw new Error('Return already verified.');

  const attempts = Number(codeRow.attempts || 0);
  if (attempts >= RETURN_MAX_ATTEMPTS) throw new Error('Too many attempts. Return is locked.');

  const expiresMs = parseDbTimestampToMs(codeRow.expires_at);
  if (!Number.isFinite(expiresMs) || Date.now() > expiresMs) {
    throw new Error('Return code expired.');
  }

  const usingCode = Boolean(code);
  const provided = usingCode ? String(code).trim() : String(qrToken || '').trim();
  const expectedHash = usingCode ? codeRow.code : codeRow.qr_token_hash;
  if (!expectedHash) throw new Error('Return payload not generated yet.');

  const providedHash = hashWithPepper(provided);
  const ok = crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(expectedHash));

  if (!ok) {
    await supabase
      .from(CODE_TABLE)
      .update({ attempts: attempts + 1 })
      .eq('id', codeRow.id);
    throw new Error('Invalid return code.');
  }

  const nowIso = new Date().toISOString();
  const { error: verifyError } = await supabase
    .from(CODE_TABLE)
    .update({
      verified_at: nowIso,
      verified_by: verifierUserId,
    })
    .eq('id', codeRow.id);
  if (verifyError) throw verifyError;

  await updateReservationStatus(reservationId, 'finished');
  return { reservationId, verifiedAt: nowIso };
};
