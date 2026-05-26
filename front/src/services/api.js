//const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_BASE_URL = (() => {
  if (process?.env?.EXPO_PUBLIC_API_BASE_URL) return process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
})();

if (!process?.env?.EXPO_PUBLIC_API_BASE_URL) {
  console.warn('EXPO_PUBLIC_API_BASE_URL not set — using', API_BASE_URL);
}

console.log('Resolved API base:', API_BASE_URL);

if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
  console.warn('Missing EXPO_PUBLIC_API_BASE_URL in front/.env');
}

export const buildApiUrl = (path) => {
  const base = (API_BASE_URL || '').replace(/\/+$/, '');
  const route = path.startsWith('/') ? path : `/${path}`;
  return `${base}${route}`;
};

export const fetchJson = async (path, options = {}) => {
  const isFormDataBody =
    typeof FormData !== 'undefined' && options?.body && options.body instanceof FormData;

  // RN fetch + AbortController can be flaky with multipart/FormData uploads.
  // For uploads, skip the timeout/signal and rely on the native network stack.
  const controller = isFormDataBody ? null : new AbortController();
  const timeoutMs = options.timeoutMs ?? 12000;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const { timeoutMs: _timeoutMs, ...fetchOptions } = options;

  const url = buildApiUrl(path);
  console.log('API Request:', { url, method: fetchOptions.method || 'GET' });

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      ...(controller ? { signal: controller.signal } : {}),
    });
    console.log('API Response:', { status: response.status, statusText: response.statusText });
  } catch (error) {
    console.error('API Fetch Error:', error.message, error.name);
    if (error.name === 'AbortError') {
      console.error('API Timeout Error:', 'Timeout: backend non joignable (12s)');
      throw new Error('Timeout: backend non joignable (12s)');
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
    console.log('API Data:', data);
  } catch (_error) {
    console.error('JSON Parse Error:', _error.message);
    data = {};
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || 'Request failed';
    console.error('API Error Response:', { status: response.status, error: errorMsg });
    throw new Error(errorMsg);
  }

  return data;
};
