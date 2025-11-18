import { API_URL, USE_HTTP_ONLY_COOKIE } from '../config';
import tokenService from './tokenService';

const DEFAULT_HEADERS = {
  Accept: 'application/json'
};

function normalizeBody(body, headers) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isSearchParams = body instanceof URLSearchParams;
  const isBlob = typeof Blob !== 'undefined' && body instanceof Blob;
  if (!body || isFormData || isSearchParams || isBlob) {
    return body;
  }

  if (typeof body === 'string') {
    return body;
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return JSON.stringify(body);
}

async function parseResponse(response, responseType = 'json') {
  if (responseType === 'blob') return response.blob();
  if (responseType === 'text') return response.text();
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON response', error);
    return text;
  }
}

async function request(path, options = {}) {
  const {
    method = 'GET',
    headers: customHeaders = {},
    body,
    responseType = 'json',
    ...rest
  } = options;

  const headers = new Headers({ ...DEFAULT_HEADERS, ...customHeaders });
  const token = tokenService.getToken();
  if (token && !USE_HTTP_ONLY_COOKIE) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const normalizedBody = normalizeBody(body, headers);
  if (normalizedBody instanceof FormData) {
    headers.delete('Content-Type');
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: normalizedBody,
    credentials: USE_HTTP_ONLY_COOKIE ? 'include' : 'same-origin',
    ...rest
  });

  if (response.status === 401) {
    tokenService.logout();
    throw new Error('Unauthorized');
  }

  const data = await parseResponse(response, responseType);
  if (!response.ok) {
    const error = new Error(data?.detail || 'Request failed');
    error.data = data;
    throw error;
  }

  return data;
}

const apiClient = {
  request,
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' })
};

export default apiClient;
