import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

vi.mock('./context', () => ({
  useVault: () => ({ user: { verified: true }, t: (text) => text, setNotice: vi.fn() }),
}));

afterEach(() => vi.unstubAllGlobals());

it('returns to the remaining files after removing the last file on the last page', async () => {
  let files = Array.from({ length: 31 }, (_, index) => ({
    id: index + 1,
    filename: `file-${index + 1}.txt`,
    mime_type: 'text/plain',
    tags: [],
    version: 1,
    size_bytes: 10,
    updated_at: '2026-01-01T00:00:00Z',
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path, options = {}) => {
      const url = new URL(path, 'http://localhost');
      if (options.method === 'DELETE') {
        files = files.filter((file) => url.pathname !== `/api/files/${file.id}`);
        return new Response(null, { status: 204 });
      }
      if (url.pathname === '/api/files') {
        const offset = Number(url.searchParams.get('offset'));
        return new Response(JSON.stringify({ items: files.slice(offset, offset + 30), total: files.length }));
      }
      if (url.pathname === '/api/folders') return new Response('[]');
      if (url.pathname === '/api/storage') return new Response('{}');
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: 'file-1.txt' });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Move to trash file-31.txt' }));
  await waitFor(() => expect(screen.getByText('30 files')).toBeInTheDocument());
  expect(await screen.findByRole('button', { name: 'file-1.txt' })).toBeInTheDocument();
  expect(screen.queryByText('No files here yet')).not.toBeInTheDocument();
});
