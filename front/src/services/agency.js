import { Platform } from 'react-native';
import { fetchJson } from './api';

const authHeaders = (token, extra = {}) => ({
  ...extra,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

const inferMimeType = ({ file, safeUri, safeName }) => {
  const explicit = String(file?.type || '').toLowerCase();
  if (allowedMimeTypes.has(explicit)) return explicit;

  const source = String(file?.name || safeName || safeUri || '').toLowerCase();
  if (source.endsWith('.pdf')) return 'application/pdf';
  if (source.endsWith('.png')) return 'image/png';
  if (source.endsWith('.webp')) return 'image/webp';
  if (source.endsWith('.jpg') || source.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
};

const extensionForMimeType = (mimeType) => {
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
};

const q = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') sp.append(key, String(value));
  });
  const query = sp.toString();
  return query ? `?${query}` : '';
};

export const getAgencyDashboard = async ({ token }) => fetchJson('/api/agency/dashboard', { headers: authHeaders(token) });

export const getAgencyDocuments = async ({ token }) => fetchJson('/api/agency/documents', { headers: authHeaders(token) });

export const uploadAgencyDocument = async ({ token, documentType, file, userId, companyId }) => {
  const formData = new FormData();
  const safeUri = String(file?.uri || '');
  const mimeType = inferMimeType({ file, safeUri, safeName: file?.name || '' });
  const safeName = file?.name || `${documentType}${extensionForMimeType(mimeType)}`;

  console.log('uploadAgencyDocument:', { documentType, mimeType, safeName, userId, companyId });

  if (Platform.OS === 'web' && file?.file) {
    formData.append('document', file.file, safeName);
  } else if (Platform.OS === 'web') {
    const response = await fetch(safeUri);
    const blob = await response.blob();
    formData.append('document', blob, safeName);
  } else {
    formData.append('document', {
      uri: safeUri,
      name: safeName,
      type: mimeType,
    });
  }

  formData.append('documentType', documentType);
  if (userId) formData.append('userId', String(userId));
  if (companyId) formData.append('companyId', String(companyId));

  try {
    const result = await fetchJson('/api/agency/documents/upload', {
      method: 'POST',
      headers: authHeaders(token),
      body: formData,
    });
    console.log('uploadAgencyDocument success:', result);
    return result;
  } catch (error) {
    console.error('uploadAgencyDocument error:', error);
    throw error;
  }
};

export const getAgencyVehicles = async ({ token, status, documentStatus }) => {
  return fetchJson(`/api/agency/vehicles${q({ status, documentStatus })}`, {
    headers: authHeaders(token),
  });
};

export const toggleAgencyVehicleVisibility = async ({ token, vehicleId }) => {
  return fetchJson(`/api/agency/vehicles/${vehicleId}/visibility`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
};

export const getAgencyRequests = async ({ token, page = 1, limit = 10, status = 'ALL' }) => {
  return fetchJson(`/api/agency/requests${q({ page, limit, status })}`, {
    headers: authHeaders(token),
  });
};

export const getAgencyProfile = async ({ token }) => fetchJson('/api/agency/profile', { headers: authHeaders(token) });
