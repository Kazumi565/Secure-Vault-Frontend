export const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
export const USE_HTTP_ONLY_COOKIE =
  (process.env.REACT_APP_USE_HTTP_ONLY_COOKIE || 'false').toLowerCase() === 'true';
export const DEMO_EMAIL = process.env.REACT_APP_DEMO_EMAIL || 'demo@securevault.local';
export const DEMO_PASSWORD =
  process.env.REACT_APP_DEMO_PASSWORD || 'DemoPassword!123';
export const TOKEN_STORAGE_KEY = 'secure-vault-token';
