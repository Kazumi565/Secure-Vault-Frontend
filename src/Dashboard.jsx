import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, FolderPlus, MoreHorizontal, RotateCcw, Search, Trash2, Upload, Files } from 'lucide-react';
import { api, formatBytes } from './api';
import { ErrorBox, FileIcon, Modal, Pager } from './components';
import { useVault } from './context';
import UploadQueue from './UploadQueue';
import FileDetails from './FileDetails';

export default function Dashboard({ trash = false }) {
  const { user, t, setNotice } = useVault();
  const [params, setParams] = useSearchParams();
  const folderId = params.get('folder') || '';
  const [files, setFiles] = useState([]),
    [total, setTotal] = useState(0),
    [folders, setFolders] = useState([]),
    [storage, setStorage] = useState(null);
  const [search, setSearch] = useState(''),
    [tag, setTag] = useState(''),
    [sort, setSort] = useState('date'),
    [order, setOrder] = useState('desc'),
    [offset, setOffset] = useState(0);
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [details, setDetails] = useState(null),
    [selected, setSelected] = useState([]),
    [folderError, setFolderError] = useState(''),
    [newFolder, setNewFolder] = useState(false),
    [folderName, setFolderName] = useState('');
  const inputRef = useRef();
  const refresh = () => {
    window.dispatchEvent(new Event('vault:files-changed'));
  };
  useEffect(() => {
    const changed = () => setRevision((n) => n + 1);
    window.addEventListener('vault:files-changed', changed);
    return () => window.removeEventListener('vault:files-changed', changed);
  }, []);
  useEffect(() => {
    setOffset(0);
    setSelected([]);
  }, [folderId, trash, search, tag, sort, order]);
  useEffect(() => {
    if (!user.verified) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({ search, tag, sort, order, offset, trash });
        if (folderId && !trash) query.set('folder_id', folderId);
        const [f, s, d] = await Promise.all([
          api('/files?' + query, { signal: controller.signal }),
          api('/storage', { signal: controller.signal }),
          api('/folders', { signal: controller.signal }),
        ]);
        setFiles(f.items);
        setTotal(f.total);
        setStorage(s);
        setFolders(d);
        setError('');
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [user.verified, folderId, trash, search, tag, sort, order, offset, revision]);
  const action = async (path, method = 'POST') => {
    setError('');
    try {
      await api(path, { method });
      setSelected([]);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };
  const batchTrash = async () => {
    try {
      await Promise.all(selected.map((id) => api(`/files/${id}`, { method: 'DELETE' })));
      setSelected([]);
      refresh();
    } catch (e) {
      setError(e.message);
      refresh();
    }
  };
  const folder = folders.find((f) => String(f.id) === folderId);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h1>{t(trash ? 'Trash' : 'Your files')}</h1>
          <p>
            {trash
              ? `Files are retained for ${storage?.trash_days || 30} days. Trash and versions count toward your quota.`
              : t('Keep your files organized, protected, and easy to find.')}
          </p>
        </div>
        {!trash && (
          <div className="button-row">
            <button
              disabled={!user.verified}
              onClick={() => {
                setFolderError('');
                setNewFolder(true);
              }}
            >
              <FolderPlus size={17} />
              {t('New folder')}
            </button>
            <button className="primary" disabled={!user.verified} onClick={() => inputRef.current?.click()}>
              <Upload size={17} />
              {t('Upload files')}
            </button>
          </div>
        )}
      </div>
      <ErrorBox error={error} />
      {folder && !trash && (
        <div className="breadcrumbs">
          <button onClick={() => setParams({})}>{t('All files')}</button>
          <span>/</span>
          <strong>{folder.name}</strong>
        </div>
      )}
      {!trash && (
        <UploadQueue
          folderId={folderId}
          limit={storage?.max_upload_bytes || 26214400}
          inputRef={inputRef}
          onComplete={refresh}
          disabled={!user.verified}
        />
      )}
      <section className="file-panel">
        <div className="file-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              aria-label={t('Search files')}
              placeholder={t('Search files')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!trash && (
            <select
              aria-label={t('Folder')}
              value={folderId}
              onChange={(e) => setParams(e.target.value ? { folder: e.target.value } : {})}
            >
              <option value="">{t('All files')}</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          <input
            className="tag-filter"
            aria-label={t('Filter by tag')}
            placeholder={t('Filter by tag')}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            maxLength={30}
          />
          <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="date">{t('Date')}</option>
            <option value="name">{t('Name')}</option>
            <option value="size">{t('Size')}</option>
          </select>
          <select aria-label="Sort order" value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="desc">{t('Descending')}</option>
            <option value="asc">{t('Ascending')}</option>
          </select>
        </div>
        {!!selected.length && !trash && (
          <div className="selection-bar">
            {selected.length} {t('Selected')}
            <button onClick={batchTrash}>
              <Trash2 size={15} />
              {t('Move to trash')}
            </button>
          </div>
        )}
        <div className="table-scroll">
          <table className="file-table">
            <thead>
              <tr>
                <th className="check-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all visible files"
                    disabled={!files.length || trash}
                    checked={!!files.length && files.every((f) => selected.includes(f.id))}
                    onChange={(e) => setSelected(e.target.checked ? files.map((f) => f.id) : [])}
                  />
                </th>
                <th>{t('Name')}</th>
                <th>{t('Size')}</th>
                <th>{t('Updated')}</th>
                <th className="align-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${file.filename}`}
                      disabled={trash}
                      checked={selected.includes(file.id)}
                      onChange={(e) =>
                        setSelected((v) =>
                          e.target.checked ? [...v, file.id] : v.filter((id) => id !== file.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <div className="file-name">
                      <FileIcon mime={file.mime_type} />
                      <div>
                        <button className="text-button filename" onClick={() => !trash && setDetails(file)}>
                          {file.filename}
                        </button>
                        <div className="file-tags">
                          {file.tags.map((tag) => (
                            <span key={tag} className="tag">
                              {tag}
                            </span>
                          ))}
                          {file.version > 1 && <small>v{file.version}</small>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="muted nowrap">{formatBytes(file.size_bytes)}</td>
                  <td className="muted nowrap">{new Date(file.updated_at).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      {trash ? (
                        <>
                          <button
                            className="icon-button"
                            aria-label={`${t('Restore')} ${file.filename}`}
                            onClick={() => action(`/files/${file.id}/restore`)}
                          >
                            <RotateCcw size={17} />
                          </button>
                          <button
                            className="icon-button danger-text"
                            aria-label={`${t('Delete permanently')} ${file.filename}`}
                            onClick={() => {
                              if (window.confirm(`Permanently delete ${file.filename} and all its versions?`))
                                action(`/files/${file.id}/permanent`, 'DELETE');
                            }}
                          >
                            <Trash2 size={17} />
                          </button>
                        </>
                      ) : (
                        <>
                          <a
                            className="icon-button"
                            aria-label={`${t('Download')} ${file.filename}`}
                            href={`/api/files/${file.id}/download`}
                          >
                            <Download size={17} />
                          </a>
                          <button
                            className="icon-button"
                            aria-label={`${t('Move to trash')} ${file.filename}`}
                            onClick={() => action(`/files/${file.id}`, 'DELETE')}
                          >
                            <Trash2 size={17} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`${t('Details')} ${file.filename}`}
                            onClick={() => setDetails(file)}
                          >
                            <MoreHorizontal size={19} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!files.length && (
          <div className="empty-state">
            <Files size={34} />
            <h3>{t(loading ? 'Loading…' : search || tag ? 'No results' : 'No files here yet')}</h3>
            <p>
              {trash
                ? 'Files you move to trash will appear here.'
                : search || tag
                  ? 'Try another search or clear your filters.'
                  : 'Upload a file to start building your library.'}
            </p>
          </div>
        )}
        <div className="table-footer">
          <span>{total} files</span>
          <span>
            Storage: {formatBytes(storage?.used_bytes)} / {formatBytes(storage?.limit_bytes || 104857600)}
          </span>
        </div>
        <Pager offset={offset} total={total} setOffset={setOffset} />
      </section>
      {details && (
        <FileDetails file={details} folders={folders} onClose={() => setDetails(null)} onChange={refresh} />
      )}
      {newFolder && (
        <Modal title={t('New folder')} onClose={() => setNewFolder(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setFolderError('');
              try {
                await api('/folders', { method: 'POST', body: { name: folderName } });
                setFolderName('');
                setNewFolder(false);
                setNotice('Folder created.');
                refresh();
              } catch (e) {
                setFolderError(e.message);
              }
            }}
          >
            <ErrorBox error={folderError} />
            <label>
              {t('Name')}
              <input
                autoFocus
                required
                maxLength={80}
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </label>
            <button className="primary">{t('Create')}</button>
          </form>
        </Modal>
      )}
    </>
  );
}
