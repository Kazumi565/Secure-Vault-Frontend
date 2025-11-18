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

describe('apiClient', () => {
  it('prefixes requests with API URL and attaches bearer token', async () => {
    const response = await apiClient.get('/test');

    expect(response).toEqual({ hello: 'world' });
    expect(global.fetch).toHaveBeenCalled();
    expect(tokenService.getToken).toHaveBeenCalled();
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/test');
    expect(options.method).toBe('GET');
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
