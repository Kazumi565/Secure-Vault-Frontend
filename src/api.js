import { DEMO_MODE } from './demo/config';

let csrfToken = '';
export function setCsrf(value) {
  csrfToken = value || '';
}

export function errorMessage(data) {
  if (Array.isArray(data?.detail)) return data.detail.map((x) => x.msg).join('. ');
  return typeof data?.detail === 'string' ? data.detail : 'Something went wrong. Please try again.';
}

export async function api(path, { method = 'GET', body, signal, blob = false } = {}) {
  if (DEMO_MODE) return (await import('./demo/store')).demoApi(path, { method, body, signal, blob });
  const headers = {};
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD'].includes(method)) headers['X-CSRF-Token'] = csrfToken;
  const response = await fetch('/api' + path, {
    method,
    headers,
    signal,
    credentials: 'same-origin',
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login') && path !== '/auth/session')
      window.dispatchEvent(new Event('vault:expired'));
    const data = await response.json().catch(() => ({}));
    const error = new Error(errorMessage(data));
    error.status = response.status;
    throw error;
  }
  if (blob) return { blob: await response.blob(), disposition: response.headers.get('Content-Disposition') };
  return response.status === 204 ? null : response.json();
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function uploadFile(file, { folderId, fileId, onProgress, signal } = {}) {
  if (DEMO_MODE)
    return import('./demo/store').then(({ demoUpload }) =>
      demoUpload(file, { folderId, fileId, onProgress, signal }),
    );
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', fileId ? `/api/files/${fileId}/versions` : '/api/files');
    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    const abort = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener('abort', abort);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      cleanup();
      let result;
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('Unexpected upload response'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(result);
      } else {
        if (xhr.status === 401) window.dispatchEvent(new Event('vault:expired'));
        reject(new Error(errorMessage(result)));
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error('Upload interrupted. Check your connection and retry.'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) {
      cleanup();
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }
    const body = new FormData();
    body.append('file', file);
    if (folderId) body.append('folder_id', folderId);
    xhr.send(body);
  });
}

export function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}
