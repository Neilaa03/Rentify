import { createWorker } from 'tesseract.js';

const DATE_PATTERN = /\b(\d{2}[/-]\d{2}[/-]\d{4})\b/g;
const LABELLED_DATE_PATTERN = /(?:exp(?:iry|iration)?(?:\s*date)?|valid\s*until|expires?\s*on)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i;
const LABELLED_NUMBER_PATTERN = /(?:document\s*(?:no|number)|id\s*(?:no|number)|license\s*(?:no|number)|pass(?:port)?\s*(?:no|number)|n[°o]\s*|num(?:ber)?\s*)[:\-]?\s*([a-z0-9][a-z0-9\-\/]{5,})/i;
const GENERIC_NUMBER_PATTERN = /\b([a-z0-9][a-z0-9\-\/]{5,})\b/gi;
const NAME_LABEL_PATTERN = /(?:full\s*name|name|holder|surname|given\s*name)\s*[:\-]?\s*(.+)/i;
const APPROVAL_CONFIDENCE_THRESHOLD = 90;
let workerPromise = null;

const normalizeText = (text = '') =>
  String(text || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

const looksLikeName = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;
  if (/\d/.test(trimmed)) return false;
  if (trimmed.length < 3) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((word) => /^[a-z'’-]+$/i.test(word));
};

const parseDateValue = (rawDate) => {
  if (!rawDate) return null;
  const match = String(rawDate).match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const isoDate = `${year}-${month}-${day}`;
  const parsed = new Date(`${isoDate}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) return null;
  return isoDate;
};

const isExpired = (isoDate) => {
  if (!isoDate) return false;
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return parsed < today;
};

const extractExpirationDate = (text) => {
  const labelled = text.match(LABELLED_DATE_PATTERN)?.[1];
  if (labelled) return parseDateValue(labelled);

  const generic = text.match(DATE_PATTERN)?.[1];
  if (generic) return parseDateValue(generic);

  return null;
};

const extractDocumentNumber = (text) => {
  const labelled = text.match(LABELLED_NUMBER_PATTERN)?.[1];
  if (labelled) return labelled.toUpperCase();

  const genericMatches = [...text.matchAll(GENERIC_NUMBER_PATTERN)]
    .map((match) => match[1])
    .filter((value) => /\d/.test(value))
    .sort((left, right) => right.length - left.length);

  return genericMatches[0]?.toUpperCase() || null;
};

const extractFullName = (text) => {
  const labelled = text.match(NAME_LABEL_PATTERN)?.[1]?.trim();
  if (labelled && looksLikeName(labelled)) return labelled;

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const candidate = lines.find((line) => looksLikeName(line));
  if (candidate) return candidate;

  const wordLines = lines.filter((line) => /^[a-z'’\-\s]+$/i.test(line) && !/\d/.test(line));
  if (wordLines.length >= 2) {
    const combined = `${wordLines[0]} ${wordLines[1]}`.trim();
    if (looksLikeName(combined)) return combined;
  }

  return null;
};

const getConfidenceScore = (data) => {
  if (typeof data?.confidence === 'number' && Number.isFinite(data.confidence)) {
    return data.confidence;
  }

  const wordConfidences = (data?.words || [])
    .map((word) => Number(word?.confidence))
    .filter((confidence) => Number.isFinite(confidence));

  if (!wordConfidences.length) return 0;

  const total = wordConfidences.reduce((sum, confidence) => sum + confidence, 0);
  return total / wordConfidences.length;
};

const getOcrWorker = async () => {
  if (!workerPromise) {
    workerPromise = createWorker('eng');
  }

  return workerPromise;
};

const recognizeDocument = async (imageUrl) => {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(imageUrl);
  return data;
};

export const extractTextFromImage = async (imageUrl) => {
  if (!imageUrl) return '';

  const data = await recognizeDocument(imageUrl);
  return {
    extractedText: normalizeText(data?.text || ''),
    confidenceScore: getConfidenceScore(data),
  };
};

export const parseDocumentFields = (extractedText) => {
  const normalizedText = normalizeText(extractedText);
  const extractedExpirationDate = extractExpirationDate(normalizedText);
  const extractedDocumentNumber = extractDocumentNumber(normalizedText);
  const extractedFullName = extractFullName(normalizedText);

  return {
    extractedText: normalizedText,
    extractedExpirationDate,
    extractedDocumentNumber,
    extractedFullName,
  };
};

export const validateDocumentExtraction = ({
  extractedText,
  extractedExpirationDate,
  extractedDocumentNumber,
  extractedFullName,
  confidenceScore,
}) => {
  const hasText = Boolean(extractedText && extractedText.trim());
  const hasAnyField = Boolean(
    extractedExpirationDate || extractedDocumentNumber || extractedFullName,
  );
  const hasMinimalFields = Boolean(
    extractedExpirationDate && (extractedDocumentNumber || extractedFullName),
  );
  const isHighConfidence = confidenceScore >= APPROVAL_CONFIDENCE_THRESHOLD;

  if (!hasText) {
    return {
      status: 'manual_review',
      verificationReason: 'OCR text was empty or unreadable.',
    };
  }

  if (!extractedExpirationDate) {
    return {
      status: 'manual_review',
      verificationReason: 'Expiration date could not be found.',
    };
  }

  if (isExpired(extractedExpirationDate)) {
    return {
      status: 'rejected',
      verificationReason: 'Document expiration date is in the past.',
    };
  }

  if (!hasAnyField) {
    return {
      status: 'rejected',
      verificationReason: 'All important fields are missing.',
    };
  }

  if (hasMinimalFields && isHighConfidence) {
    return {
      status: 'approved',
      verificationReason: 'Document extracted successfully.',
    };
  }

  return {
    status: 'manual_review',
    verificationReason: isHighConfidence
      ? 'Document is readable but missing minimum supporting fields.'
      : 'OCR confidence is too low for automatic approval.',
  };
};

export const verifyDocumentImage = async (imageUrl) => {
  const { extractedText, confidenceScore } = await extractTextFromImage(imageUrl);
  const parsedFields = parseDocumentFields(extractedText);
  const validation = validateDocumentExtraction({
    ...parsedFields,
    confidenceScore,
  });

  return {
    ...parsedFields,
    confidenceScore,
    ...validation,
  };
};
