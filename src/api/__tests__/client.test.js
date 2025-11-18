import apiClient from '../client';
import tokenService from '../tokenService';

if (typeof global.Headers === 'undefined') {
  class SimpleHeaders {
    constructor(init = {}) {
      this.map = new Map(Object.entries(init));
    }
    set(key, value) {
      this.map.set(key.toLowerCase(), value);
    }
    get(key) {
      return this.map.get(key.toLowerCase());
    }
    has(key) {
      return this.map.has(key.toLowerCase());
    }
    delete(key) {
      this.map.delete(key.toLowerCase());
    }
  }
  global.Headers = SimpleHeaders;
}

jest.mock('../../config', () => ({
  API_URL: 'https://api.example.com',
  USE_HTTP_ONLY_COOKIE: false
}));

jest.mock('../tokenService', () => ({
  getToken: jest.fn(() => 'test-token'),
  logout: jest.fn()
}));

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      status: 200,
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ hello: 'world' })),
      headers: new Headers()
    })
  );
  jest.clearAllMocks();
});

describe('apiClient in token mode', () => {
  it('prefixes requests with API URL and attaches bearer token', async () => {
    const response = await apiClient.get('/test');

    expect(response).toEqual({ hello: 'world' });
    expect(global.fetch).toHaveBeenCalled();
    expect(tokenService.getToken).toHaveBeenCalled();
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/test');
    expect(options.method).toBe('GET');
  });

  it('sets Authorization header when fallback token exists', async () => {
    tokenService.getToken.mockReturnValueOnce('my-token-123');
    
    await apiClient.get('/test');

    const [, options] = global.fetch.mock.calls[0];
    const authHeader = options.headers.get('Authorization');
    expect(authHeader).toBe('Bearer my-token-123');
  });

  it('clears stored token on 401 and triggers logout', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      text: () => Promise.resolve(''),
      headers: new Headers()
    });

    await expect(apiClient.get('/secure')).rejects.toThrow('Unauthorized');
    expect(tokenService.logout).toHaveBeenCalled();
  });

  it('forces logout on 401 responses', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      text: () => Promise.resolve(''),
      headers: new Headers()
    });

    await expect(apiClient.get('/secure')).rejects.toThrow('Unauthorized');
    expect(tokenService.logout).toHaveBeenCalled();
  });
});

describe('apiClient in cookie mode', () => {
  it('uses credentials:include when cookie mode is enabled', async () => {
    jest.resetModules();
    
    jest.doMock('../../config', () => ({
      API_URL: 'https://api.example.com',
      USE_HTTP_ONLY_COOKIE: true
    }));

    jest.doMock('../tokenService', () => ({
      __esModule: true,
      default: {
        getToken: jest.fn(() => null),
        logout: jest.fn()
      }
    }));
    
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ success: true })),
        headers: new Headers()
      })
    );

    const clientCookie = require('../client').default;
    await clientCookie.get('/test');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.credentials).toBe('include');
    
    const authHeader = options.headers.get('Authorization');
    expect(authHeader).toBeNull();
  });
});
