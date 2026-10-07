import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, errorMessage, formatBytes, setCsrf, uploadFile } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
  setCsrf('');
});
describe('API client', () => {
  it('keeps session credentials in cookies and sends CSRF for mutations', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    setCsrf('request-secret');
    await api('/auth/profile', { method: 'PATCH', body: { full_name: 'Mihai' } });
    const options = fetch.mock.calls[0][1];
    expect(options.credentials).toBe('same-origin');
    expect(options.headers['X-CSRF-Token']).toBe('request-secret');
    expect(options.headers.Authorization).toBeUndefined();
  });
  it('keeps multipart boundaries under browser control', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await api('/auth/avatar', { method: 'POST', body: new FormData() });
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });
  it('surfaces API validation errors without coercing objects', () => {
    expect(errorMessage({ detail: [{ msg: 'Invalid email' }] })).toBe('Invalid email');
  });
  it('formats real byte counts', () => {
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(1024)).toBe('1.0 KiB');
  });
  it('does not send an already-cancelled upload', async () => {
    const signal = AbortSignal.abort();
    await expect(uploadFile(new File(['a'], 'a.txt'), { signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
