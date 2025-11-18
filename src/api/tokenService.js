import { TOKEN_STORAGE_KEY, USE_HTTP_ONLY_COOKIE } from '../config';

function hasStorage() {
  try {
    const key = '__sv_test__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('[tokenService] localStorage unavailable, falling back to memory');
    return false;
  }
}

class TokenService {
  constructor() {
    this.listeners = new Set();
    this.token = null;
    this.storageAvailable =
      typeof window !== 'undefined' ? hasStorage() : false;
    if (!USE_HTTP_ONLY_COOKIE && this.storageAvailable) {
      this.token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    }
  }

  getToken() {
    return USE_HTTP_ONLY_COOKIE ? null : this.token;
  }

  setToken(token) {
    if (USE_HTTP_ONLY_COOKIE) {
      console.warn('[tokenService] Backend cookie mode enabled; ignoring token assignment');
      return;
    }
    this.token = token || null;
    if (this.storageAvailable) {
      if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } else if (token) {
      console.warn('[tokenService] Persisting token in memory only. Consider enabling HTTP-only cookies.');
    }
  }

  clearToken() {
    this.token = null;
    if (!USE_HTTP_ONLY_COOKIE && this.storageAvailable) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  onUnauthorized(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyLogout() {
    this.listeners.forEach((cb) => cb());
  }

  logout() {
    this.clearToken();
    this.notifyLogout();
  }
}

const tokenService = new TokenService();
export default tokenService;
