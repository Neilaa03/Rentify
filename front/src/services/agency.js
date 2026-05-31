import { fetchJson } from './api';

const authHeaders = (token, extra = {}) => ({
  ...extra,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

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

export const uploadAgencyDocument = async ({ token, documentType, file }) => {
  const formData = new FormData();
  const safeUri = String(file?.uri || '');
  const safeName = file?.name || `${documentType}.pdf`;
  const mimeType = file?.type || (safeName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

  formData.append('documentType', documentType);

  if (typeof window !== 'undefined' && file?.uri && file.uri.startsWith('data:')) {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    formData.append('document', blob, safeName);
  } else {
    formData.append('document', {
      uri: safeUri,
      name: safeName,
      type: mimeType,
    });
  }

  return fetchJson('/api/agency/documents/upload', {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
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
