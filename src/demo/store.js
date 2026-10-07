const LIMIT = 32 * 1024 * 1024;
const MAX_UPLOAD = 5 * 1024 * 1024;
let state;

const now = () => new Date().toISOString();
const ago = (hours) => new Date(Date.now() - hours * 3600000).toISOString();
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};

function seed() {
  const text = (value, type = 'text/plain') => new Blob([value], { type });
  const make = (id, filename, folder_id, tags, versions, hours, deleted = false) => ({
    id,
    filename,
    folder_id,
    tags,
    updated_at: ago(hours),
    deleted_at: deleted ? ago(hours) : null,
    current: versions.length,
    versions: versions.map((blob, i) => ({
      number: i + 1,
      blob,
      created_at: ago(hours + versions.length - i),
    })),
    shares: [],
  });
  return {
    nextId: 20,
    user: {
      id: 1,
      email: 'visitor@example.test',
      full_name: 'Alex Morgan',
      verified: true,
      role: 'user',
      two_factor: false,
      has_avatar: false,
    },
    folders: [
      { id: 1, name: 'Projects' },
      { id: 2, name: 'Personal' },
      { id: 3, name: 'Reference' },
    ],
    files: [
      make(
        1,
        'Welcome to Secure Vault.txt',
        3,
        ['start-here'],
        [
          text(
            'Welcome to the Secure Vault interactive demo!\n\nTry creating a folder, editing tags, adding a file version, or restoring a file from Trash.\n\nEverything stays in this tab and resets on refresh. No account is required.\nAuthentication, encryption and public sharing are not active in this showcase.\n\nSource: https://github.com/Kazumi565/Secure-Vault\n',
          ),
        ],
        1,
      ),
      make(
        2,
        'Project brief.md',
        1,
        ['work', 'planning'],
        [
          text('# Project brief\n\nDraft 1: build a simple home for personal files.\n', 'text/markdown'),
          text(
            '# Project brief\n\nDraft 2: organize files with folders, tags, version history and recoverable trash.\n\nNext: review the mobile interface and document the security model.\n',
            'text/markdown',
          ),
        ],
        3,
      ),
      make(
        3,
        'Trip budget.csv',
        2,
        ['travel', 'budget'],
        [
          text(
            'Category,Planned EUR\nTransport,120\nAccommodation,240\nFood,100\nActivities,60\n',
            'text/csv',
          ),
        ],
        7,
      ),
      make(
        4,
        'Workspace preview.png',
        1,
        ['design'],
        [{ asset: 'demo-assets/workspace.png', size: 103832, type: 'image/png' }],
        12,
      ),
      make(
        5,
        'Reading list.txt',
        2,
        ['personal'],
        [
          text(
            'Weekend reading\n\n- Designing Data-Intensive Applications\n- The Pragmatic Programmer\n- Web accessibility guidelines\n',
          ),
        ],
        24,
      ),
      make(
        6,
        'Meeting notes.md',
        1,
        ['work'],
        [
          text(
            '# Design review\n\n- Keep important actions easy to find.\n- Make errors understandable.\n- Support keyboard navigation.\n',
            'text/markdown',
          ),
        ],
        36,
      ),
      make(
        7,
        'Archived checklist.txt',
        3,
        ['archive'],
        [
          text(
            'Archived checklist\n\n[x] Sketch the interface\n[x] Test file workflows\n[ ] Restore this file from Trash\n',
          ),
        ],
        48,
        true,
      ),
    ],
    activity: [
      {
        id: 1,
        action: 'file.uploaded',
        filename: 'Welcome to Secure Vault.txt',
        actor: 'Alex Morgan',
        created_at: ago(1),
        detail: 'Sample activity',
      },
      {
        id: 2,
        action: 'version.uploaded',
        filename: 'Project brief.md',
        actor: 'Alex Morgan',
        created_at: ago(3),
        detail: 'Version 2',
      },
      {
        id: 3,
        action: 'file.trashed',
        filename: 'Archived checklist.txt',
        actor: 'Alex Morgan',
        created_at: ago(48),
        detail: 'Ready to restore',
      },
    ],
    sessions: [
      { id: 1, current: true, agent: 'This browser · demo session', created_at: ago(1) },
      { id: 2, current: false, agent: 'Sample mobile browser', created_at: ago(24) },
    ],
  };
}

const db = () => (state ??= seed());
export function resetDemo() {
  state = seed();
}
function record(action, file, detail = '') {
  db().activity.unshift({
    id: db().nextId++,
    action,
    filename: file?.filename || '',
    actor: db().user.full_name,
    created_at: now(),
    detail,
  });
}
function fileById(id) {
  return db().files.find((file) => file.id === Number(id)) || fail('This demo file no longer exists.', 404);
}
function versionOf(file, number = file.current) {
  return (
    file.versions.find((version) => version.number === Number(number)) || fail('Version not found.', 404)
  );
}
function summary(file) {
  const version = versionOf(file);
  return {
    id: file.id,
    filename: file.filename,
    folder_id: file.folder_id,
    tags: [...file.tags],
    updated_at: file.updated_at,
    deleted_at: file.deleted_at,
    version: file.current,
    size_bytes: version.blob.size,
    mime_type: version.blob.type,
  };
}
function usedBytes() {
  return db().files.reduce(
    (sum, file) => sum + file.versions.reduce((n, version) => n + version.blob.size, 0),
    0,
  );
}
function page(items, params) {
  const offset = Math.max(0, Number(params.get('offset')) || 0);
  return { items: items.slice(offset, offset + 30), total: items.length };
}
function folderId(value) {
  if (!value) return null;
  if (!db().folders.some((folder) => folder.id === Number(value))) fail('Folder not found.');
  return Number(value);
}
function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
}
async function download(file, number, signal) {
  if (file.deleted_at) fail('Restore this file before downloading it.');
  const version = versionOf(file, number || file.current);
  let blob = version.blob;
  if (blob.asset) {
    const response = await fetch(import.meta.env.BASE_URL + blob.asset, { signal });
    if (!response.ok) fail('The sample image could not be loaded.');
    blob = await response.blob();
  }
  return { blob, disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}` };
}

export async function demoApi(path, { method = 'GET', body = {}, signal } = {}) {
  await wait(50, signal);
  const url = new URL(path, 'https://demo.invalid');
  const route = url.pathname;
  const params = url.searchParams;
  if (route === '/auth/session' && method === 'GET') return { user: { ...db().user }, csrf_token: '' };
  if (route === '/auth/profile' && method === 'PATCH') {
    db().user.full_name =
      String(body.full_name || '')
        .trim()
        .slice(0, 120) || 'Demo visitor';
    record('profile.updated');
    return { ...db().user };
  }
  if (route === '/auth/sessions' && method === 'GET') return db().sessions.map((s) => ({ ...s }));
  const sessionMatch = route.match(/^\/auth\/sessions\/(\d+)$/);
  if (sessionMatch && method === 'DELETE') {
    if (Number(sessionMatch[1]) === 1) fail('Use Reset demo to restart this demo session.');
    db().sessions = db().sessions.filter((s) => s.id !== Number(sessionMatch[1]));
    record('session.revoked');
    return null;
  }
  if (route === '/storage' && method === 'GET')
    return { used_bytes: usedBytes(), limit_bytes: LIMIT, max_upload_bytes: MAX_UPLOAD, trash_days: 30 };
  if (route === '/folders') {
    if (method === 'GET') return db().folders.map((folder) => ({ ...folder }));
    if (method === 'POST') {
      const name = String(body.name || '').trim();
      if (!name || name.length > 80) fail('Enter a folder name of 1 to 80 characters.');
      if (db().folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase()))
        fail('A folder with this name already exists.');
      const folder = { id: db().nextId++, name };
      db().folders.push(folder);
      record('folder.created', null, name);
      return { ...folder };
    }
  }
  const folderMatch = route.match(/^\/folders\/(\d+)$/);
  if (folderMatch && method === 'DELETE') {
    const id = Number(folderMatch[1]);
    db().folders = db().folders.filter((folder) => folder.id !== id);
    db().files.forEach((file) => {
      if (file.folder_id === id) file.folder_id = null;
    });
    record('folder.deleted');
    return null;
  }
  if (route === '/files' && method === 'GET') {
    let files = db().files.filter((file) => Boolean(file.deleted_at) === (params.get('trash') === 'true'));
    if (params.get('folder_id'))
      files = files.filter((file) => file.folder_id === Number(params.get('folder_id')));
    const search = (params.get('search') || '').toLowerCase();
    const tag = (params.get('tag') || '').toLowerCase();
    files = files.filter(
      (file) =>
        file.filename.toLowerCase().includes(search) &&
        (!tag || file.tags.some((t) => t.toLowerCase() === tag)),
    );
    const direction = params.get('order') === 'asc' ? 1 : -1;
    const sort = params.get('sort');
    const items = files
      .map(summary)
      .sort(
        (a, b) =>
          direction *
          (sort === 'name'
            ? a.filename.localeCompare(b.filename)
            : sort === 'size'
              ? a.size_bytes - b.size_bytes
              : a.updated_at.localeCompare(b.updated_at)),
      );
    return page(items, params);
  }
  if (route === '/activity' && method === 'GET') {
    const action = params.get('action');
    return page(
      db()
        .activity.filter((item) => !action || item.action === action)
        .map((item) => ({ ...item })),
      params,
    );
  }
  const shared = route.match(/^\/shared\/([^/]+)\/download$/);
  if (shared && method === 'POST') {
    const file = db().files.find((file) => file.shares.some((share) => share.token === shared[1]));
    const share = file?.shares.find((share) => share.token === shared[1]);
    if (
      !share ||
      file.deleted_at ||
      Date.parse(share.expires_at) <= Date.now() ||
      share.downloads >= share.max_downloads
    )
      fail(
        'This local preview link has expired, was revoked, or belongs to another tab. Create a new one in the demo.',
        404,
      );
    if (share.password_protected && body.password !== '123456') fail('Enter the demo code: 123456.', 403);
    const result = await download(file, null, signal);
    // Recheck after loading a sample asset in case another request used the final download.
    if (
      !file.shares.includes(share) ||
      share.downloads >= share.max_downloads ||
      Date.parse(share.expires_at) <= Date.now()
    )
      fail('This local preview link is no longer available.', 404);
    share.downloads++;
    record('share.downloaded', file);
    return result;
  }
  const match = route.match(/^\/files\/(\d+)(.*)$/);
  if (match) {
    const file = fileById(match[1]);
    const rest = match[2];
    if (!rest && method === 'PATCH') {
      const filename = String(body.filename || '').trim();
      if (!filename || filename.length > 240 || /[/\\]/.test(filename))
        fail('Enter a valid filename of up to 240 characters.');
      const tags = [...new Set((body.tags || []).map((tag) => String(tag).trim()).filter(Boolean))];
      if (tags.length > 10 || tags.some((tag) => tag.length > 30))
        fail('Use up to 10 tags, each up to 30 characters.');
      const folder = folderId(body.folder_id);
      Object.assign(file, { filename, tags, folder_id: folder, updated_at: now() });
      record('file.updated', file);
      return summary(file);
    }
    if (!rest && method === 'DELETE') {
      file.deleted_at = now();
      file.shares = [];
      record('file.trashed', file);
      return null;
    }
    if (rest === '/restore' && method === 'POST') {
      file.deleted_at = null;
      record('file.restored', file);
      return summary(file);
    }
    if (rest === '/permanent' && method === 'DELETE') {
      if (!file.deleted_at) fail('Move this file to Trash first.');
      db().files = db().files.filter((item) => item !== file);
      record('file.purged', file);
      return null;
    }
    if (rest === '/download' && method === 'GET') {
      const result = await download(file, params.get('version'), signal);
      record('file.downloaded', file);
      return result;
    }
    if (rest === '/versions' && method === 'GET')
      return file.versions.map((v) => ({
        number: v.number,
        current: v.number === file.current,
        created_at: v.created_at,
        size_bytes: v.blob.size,
      }));
    const versionMatch = rest.match(/^\/versions\/(\d+)(\/restore)?$/);
    if (versionMatch) {
      const version = versionOf(file, versionMatch[1]);
      if (versionMatch[2] && method === 'POST') {
        file.current = version.number;
        file.updated_at = now();
        record('version.restored', file);
        return summary(file);
      }
      if (!versionMatch[2] && method === 'DELETE') {
        if (file.current === version.number) fail('The current version cannot be deleted.');
        file.versions = file.versions.filter((v) => v !== version);
        record('version.deleted', file);
        return null;
      }
    }
    if (rest === '/shares') {
      if (method === 'GET') return file.shares.map(({ token: _token, ...share }) => share);
      if (method === 'POST') {
        if (file.deleted_at) fail('Restore this file before creating a preview link.');
        if (!(body.hours >= 1 && body.hours <= 168 && body.max_downloads >= 1 && body.max_downloads <= 100))
          fail('Choose 1–168 hours and 1–100 downloads.');
        const share = {
          id: db().nextId++,
          token: crypto.randomUUID(),
          downloads: 0,
          max_downloads: body.max_downloads,
          expires_at: new Date(Date.now() + body.hours * 3600000).toISOString(),
          password_protected: Boolean(body.password),
        };
        file.shares.push(share);
        record('share.created', file);
        return { url: `${window.location.origin}${window.location.pathname}#/share/${share.token}` };
      }
    }
    const shareMatch = rest.match(/^\/shares\/(\d+)$/);
    if (shareMatch && method === 'DELETE') {
      file.shares = file.shares.filter((s) => s.id !== Number(shareMatch[1]));
      record('share.revoked', file);
      return null;
    }
  }
  fail('This account or server operation is unavailable in the browser demo.', 400);
}

export async function demoUpload(file, { folderId: folder, fileId, signal, onProgress } = {}) {
  if (file.size > MAX_UPLOAD) fail('Demo files must be 5 MiB or smaller.');
  const checkSpace = () => {
    if (usedBytes() + file.size > LIMIT)
      fail('The demo is full. Delete an item permanently or reset the demo.');
  };
  checkSpace();
  // Simulated progress makes cancellation and the upload queue explorable without a server.
  for (let progress = 10; progress <= 90; progress += 10) {
    await wait(70, signal);
    onProgress?.(progress);
  }
  checkSpace();
  const target = fileId ? fileById(fileId) : null;
  if (target?.deleted_at) fail('Restore this file before adding a version.');
  const timestamp = now();
  const number = target ? Math.max(...target.versions.map((v) => v.number)) + 1 : 1;
  const version = { number, blob: file, created_at: timestamp };
  if (target) {
    target.versions.push(version);
    target.current = number;
    target.updated_at = timestamp;
    record('version.uploaded', target);
  } else {
    const item = {
      id: db().nextId++,
      filename: file.name,
      folder_id: folderId(folder),
      tags: [],
      updated_at: timestamp,
      deleted_at: null,
      current: 1,
      versions: [version],
      shares: [],
    };
    db().files.push(item);
    record('file.uploaded', item);
  }
  onProgress?.(100);
  return { message: 'Added to this demo tab.' };
}
