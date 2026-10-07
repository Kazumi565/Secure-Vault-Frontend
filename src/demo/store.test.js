import { beforeEach, describe, expect, it } from 'vitest';
import { demoApi, demoUpload, resetDemo } from './store';

beforeEach(resetDemo);

describe('browser demo state', () => {
  it('keeps trash and versions in the quota until permanent deletion', async () => {
    const before = await demoApi('/storage');
    const versions = await demoApi('/files/2/versions');
    await demoApi('/files/2', { method: 'DELETE' });
    expect((await demoApi('/storage')).used_bytes).toBe(before.used_bytes);
    await demoApi('/files/2/permanent', { method: 'DELETE' });
    expect((await demoApi('/storage')).used_bytes).toBe(
      before.used_bytes - versions.reduce((n, v) => n + v.size_bytes, 0),
    );
  });

  it('does not retain an aborted or oversized upload', async () => {
    const before = await demoApi('/storage');
    const controller = new AbortController();
    const upload = demoUpload(new File(['notes'], 'notes.txt'), {
      signal: controller.signal,
      onProgress: () => controller.abort(),
    });
    await expect(upload).rejects.toMatchObject({ name: 'AbortError' });
    await expect(demoUpload({ size: 5 * 1024 * 1024 + 1 })).rejects.toThrow('5 MiB');
    expect((await demoApi('/storage')).used_bytes).toBe(before.used_bytes);
    expect((await demoApi('/files?search=notes.txt')).total).toBe(0);
  });

  it('restores the old version and maintains independent metadata responses', async () => {
    const listed = await demoApi('/files?search=Project');
    listed.items[0].tags.push('outside-mutation');
    expect((await demoApi('/files?tag=outside-mutation')).total).toBe(0);
    await demoApi('/files/2/versions/1/restore', { method: 'POST' });
    expect((await demoApi('/files?search=Project')).items[0].version).toBe(1);
    await expect(demoApi('/files/2/versions/1', { method: 'DELETE' })).rejects.toThrow('current version');
  });

  it('enforces the demo code, download limits, and revocation on trash', async () => {
    const result = await demoApi('/files/1/shares', {
      method: 'POST',
      body: { hours: 1, max_downloads: 1, password: '123456' },
    });
    const token = result.url.split('/share/')[1];
    const path = `/shared/${token}/download`;
    await expect(demoApi(path, { method: 'POST', body: { password: 'wrong' } })).rejects.toMatchObject({
      status: 403,
    });
    expect((await demoApi(path, { method: 'POST', body: { password: '123456' } })).blob.size).toBeGreaterThan(
      0,
    );
    await expect(demoApi(path, { method: 'POST', body: { password: '123456' } })).rejects.toMatchObject({
      status: 404,
    });
    await demoApi('/files/1', { method: 'DELETE' });
    expect(await demoApi('/files/1/shares')).toEqual([]);
  });

  it('removes local changes on reset and never falls back for unsupported routes', async () => {
    await demoApi('/folders', { method: 'POST', body: { name: 'Temporary folder' } });
    resetDemo();
    expect((await demoApi('/folders')).map((folder) => folder.name)).not.toContain('Temporary folder');
    await expect(demoApi('/auth/password', { method: 'POST' })).rejects.toThrow('unavailable');
  });
});
