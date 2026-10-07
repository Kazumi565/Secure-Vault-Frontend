import { useCallback, useEffect, useState } from 'react';
import { api, formatBytes, uploadFile } from './api';
import { DownloadLink, ErrorBox, Modal } from './components';
import { DEMO_MODE } from './demo/config';
import { Link } from 'react-router-dom';
import { useVault } from './context';

export default function FileDetails({ file, folders, onClose, onChange }) {
  const { t, setNotice } = useVault();
  const [tab, setTab] = useState('Details'),
    [name, setName] = useState(file.filename),
    [folder, setFolder] = useState(file.folder_id || ''),
    [tags, setTags] = useState(file.tags.join(', '));
  const [versions, setVersions] = useState([]),
    [shares, setShares] = useState([]),
    [url, setUrl] = useState(''),
    [preview, setPreview] = useState('');
  const [hours, setHours] = useState(24),
    [count, setCount] = useState(5),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const [v, s] = await Promise.all([api(`/files/${file.id}/versions`), api(`/files/${file.id}/shares`)]);
    setVersions(v);
    setShares(s);
  }, [file.id]);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  useEffect(() => {
    if (tab !== 'Preview') return;
    let url;
    const controller = new AbortController();
    api(`/files/${file.id}/download?inline=true`, { blob: true, signal: controller.signal })
      .then((result) => {
        url = URL.createObjectURL(result.blob);
        setPreview(url);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
      setPreview('');
    };
  }, [tab, file.id]);
  const run = async (task) => {
    setError('');
    setBusy(true);
    try {
      await task();
      await refresh();
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const canPreview = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/ogg',
  ].includes(file.mime_type);
  return (
    <Modal title={file.filename} onClose={onClose}>
      <div className="tabs">
        {['Details', 'Versions', 'Share', ...(canPreview ? ['Preview'] : [])].map((x) => (
          <button key={x} className={tab === x ? 'active' : ''} onClick={() => setTab(x)}>
            {t(x)}
          </button>
        ))}
      </div>
      <ErrorBox error={error} />
      {tab === 'Details' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api(`/files/${file.id}`, {
                method: 'PATCH',
                body: {
                  filename: name,
                  folder_id: folder ? Number(folder) : null,
                  tags: tags
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                },
              });
              setNotice('File details saved.');
              onClose();
            });
          }}
        >
          <label>
            {t('Name')}
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={240} />
          </label>
          <label>
            {t('Folder')}
            <select value={folder} onChange={(e) => setFolder(e.target.value)}>
              <option value="">{t('All files')}</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('Tags')}
            <input
              aria-label={t('Tags')}
              aria-describedby="tags-help"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="work, personal"
            />
            <small id="tags-help">Separate tags with commas. Up to 10 tags.</small>
          </label>
          <button className="primary" disabled={busy}>
            {t('Save')}
          </button>
        </form>
      )}
      {tab === 'Versions' && (
        <div>
          <p className="muted">
            All retained versions count toward your storage. Restore a version to make it current.
          </p>
          <label className="button file-input-button">
            {t('Add version')}
            <input
              type="file"
              disabled={busy}
              onChange={(e) => {
                const selected = e.target.files[0];
                if (selected) run(() => uploadFile(selected, { fileId: file.id }));
                e.target.value = '';
              }}
            />
          </label>
          <div className="version-list">
            {versions.map((v) => (
              <div className="version-row" key={v.number}>
                <div>
                  <strong>
                    v{v.number} {v.current && <span className="badge">{t('Current version')}</span>}
                  </strong>
                  <p>
                    {formatBytes(v.size_bytes)} · {new Date(v.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="button-row">
                  <DownloadLink
                    className="button small"
                    path={`/files/${file.id}/download?version=${v.number}`}
                    filename={file.filename}
                  >
                    {t('Download')}
                  </DownloadLink>
                  {!v.current && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(() => api(`/files/${file.id}/versions/${v.number}/restore`, { method: 'POST' }))
                        }
                      >
                        {t('Restore')}
                      </button>
                      <button
                        className="danger-text"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm('Permanently delete this version?'))
                            run(() => api(`/files/${file.id}/versions/${v.number}`, { method: 'DELETE' }));
                        }}
                      >
                        {t('Delete')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'Share' && (
        <div>
          <p className="muted">
            {DEMO_MODE
              ? 'Preview links work only in this tab, until refresh. They cannot share files with other people. Expiry and download limits are simulated locally.'
              : 'Links allow downloading the current version. Moving this file to trash revokes its links.'}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const result = await api(`/files/${file.id}/shares`, {
                  method: 'POST',
                  body: { hours: Number(hours), max_downloads: Number(count), password },
                });
                setUrl(result.url);
                setPassword('');
              });
            }}
          >
            <div className="two-columns">
              <label>
                {t('Expires in hours')}
                <input
                  type="number"
                  min="1"
                  max="168"
                  required
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </label>
              <label>
                {t('Download limit')}
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </label>
            </div>
            {DEMO_MODE ? (
              <label className="demo-code-option">
                <input
                  type="checkbox"
                  checked={Boolean(password)}
                  onChange={(e) => setPassword(e.target.checked ? '123456' : '')}
                />
                Require demo code: 123456
              </label>
            ) : (
              <label>
                {t('Optional password')}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
            )}
            <button className="primary" disabled={busy}>
              {DEMO_MODE ? 'Create preview link' : t('Create link')}
            </button>
          </form>
          {url && (
            <div className="share-result">
              <input aria-label="Share link" readOnly value={url} />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setNotice('Link copied.');
                  } catch {
                    setNotice('Select the link and copy it manually.');
                  }
                }}
              >
                {t('Copy link')}
              </button>
              {DEMO_MODE ? (
                <Link className="button" to={new URL(url).hash.slice(1)}>
                  Open local preview
                </Link>
              ) : (
                <small>Copy it now. The full link is shown only once.</small>
              )}
            </div>
          )}
          <div className="version-list">
            {shares.map((s) => (
              <div className="version-row" key={s.id}>
                <div>
                  <strong>
                    {s.downloads} / {s.max_downloads} downloads {s.password_protected && '· Password'}
                  </strong>
                  <p>Expires {new Date(s.expires_at).toLocaleString()}</p>
                </div>
                <button
                  disabled={busy}
                  onClick={() => run(() => api(`/files/${file.id}/shares/${s.id}`, { method: 'DELETE' }))}
                >
                  {t('Revoke')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'Preview' && (
        <div className="preview-area">
          {!preview ? (
            <p>Loading preview…</p>
          ) : file.mime_type.startsWith('image/') ? (
            <img src={preview} alt={file.filename} />
          ) : file.mime_type.startsWith('video/') ? (
            <video src={preview} controls />
          ) : (
            <audio src={preview} controls />
          )}
        </div>
      )}
    </Modal>
  );
}
