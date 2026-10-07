import { useEffect, useState } from 'react';
import { Download, History } from 'lucide-react';
import { api, formatBytes } from './api';
import { ErrorBox, Pager } from './components';
import { useVault } from './context';

export default function Activity({ admin = false }) {
  const { t, user, setNotice } = useVault();
  const [tab, setTab] = useState('Activity'),
    [action, setAction] = useState(''),
    [offset, setOffset] = useState(0),
    [data, setData] = useState({ items: [], total: 0 }),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  const refresh = () => setRevision((n) => n + 1);
  useEffect(() => setOffset(0), [tab, action]);
  useEffect(() => {
    const controller = new AbortController();
    const path = admin
      ? tab === 'Activity'
        ? '/admin/activity'
        : tab === 'Users'
          ? '/admin/users'
          : '/admin/files'
      : '/activity';
    api(`${path}?offset=${offset}&action=${encodeURIComponent(action)}`, { signal: controller.signal })
      .then((x) => {
        setData(x);
        setError('');
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => controller.abort();
  }, [admin, tab, offset, action, revision]);
  const run = async (task) => {
    setError('');
    try {
      await task();
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{admin ? 'VAULT MANAGEMENT' : 'YOUR VAULT HISTORY'}</div>
          <h1>{t(admin ? 'Administration' : 'Activity')}</h1>
          <p>
            {admin
              ? 'Manage users and files with an exact record of each action.'
              : 'A record of changes and downloads in your vault.'}
          </p>
        </div>
        {admin && (
          <a className="button" href="/api/admin/activity/export">
            <Download size={16} />
            {t('Export CSV')}
          </a>
        )}
      </div>
      <ErrorBox error={error} />
      {admin && (
        <div className="tabs">
          {['Activity', 'Users', 'Files'].map((x) => (
            <button className={tab === x ? 'active' : ''} onClick={() => setTab(x)} key={x}>
              {t(x)}
            </button>
          ))}
          <button
            onClick={() =>
              run(async () => {
                const result = await api('/admin/maintenance', { method: 'POST' });
                setNotice(
                  `Maintenance finished: ${result.objects_removed} objects removed, ${result.cleanup_failures} deferred.`,
                );
              })
            }
          >
            Run maintenance
          </button>
        </div>
      )}
      {tab === 'Activity' && (
        <div className="activity-filter">
          <label>
            Event type
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All events</option>
              {[
                'file.uploaded',
                'file.downloaded',
                'file.trashed',
                'file.restored',
                'file.purged',
                'version.uploaded',
                'share.created',
                'share.downloaded',
                'session.created',
                'password.changed',
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <section className="file-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {(tab === 'Activity'
                  ? ['Date', 'Owner', 'Name', 'Activity']
                  : tab === 'Users'
                    ? ['Email', 'Role', 'Storage', 'Actions']
                    : ['Name', 'Owner', 'Size', 'Actions']
                ).map((x) => (
                  <th key={x}>{t(x)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  {tab === 'Activity' ? (
                    <>
                      <td className="nowrap muted">{new Date(row.created_at).toLocaleString()}</td>
                      <td>{row.actor}</td>
                      <td>{row.filename || '—'}</td>
                      <td>
                        <span className="event-name">{row.action.replaceAll('.', ' ')}</span>
                        {row.detail && <small className="block muted">{row.detail}</small>}
                      </td>
                    </>
                  ) : tab === 'Users' ? (
                    <>
                      <td>
                        {row.email}
                        <small className="block muted">
                          #{row.id} · {row.verified ? 'Verified' : 'Unverified'}
                        </small>
                      </td>
                      <td>
                        <span className="badge">{row.role}</span>
                      </td>
                      <td>{formatBytes(row.used_bytes)}</td>
                      <td>
                        <div className="button-row">
                          <button
                            disabled={row.id === user.id}
                            onClick={() =>
                              run(() =>
                                api(`/admin/users/${row.id}/role`, {
                                  method: 'PATCH',
                                  body: { role: row.role === 'admin' ? 'user' : 'admin' },
                                }),
                              )
                            }
                          >
                            {row.role === 'admin' ? 'Make user' : 'Make admin'}
                          </button>
                          <button
                            className="danger-text"
                            disabled={row.role === 'admin'}
                            onClick={() => {
                              if (window.confirm(`Delete ${row.email} and all their files?`))
                                run(() => api(`/admin/users/${row.id}`, { method: 'DELETE' }));
                            }}
                          >
                            {t('Delete')}
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        {row.filename}
                        <small className="block muted">
                          File #{row.id} {row.deleted_at ? '· In trash' : ''}
                        </small>
                      </td>
                      <td>#{row.owner_id}</td>
                      <td>{formatBytes(row.size_bytes)}</td>
                      <td>
                        <button
                          className="danger-text"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Permanently delete file #${row.id}, ${row.filename}, belonging to user #${row.owner_id}?`,
                              )
                            )
                              run(() => api(`/admin/files/${row.id}`, { method: 'DELETE' }));
                          }}
                        >
                          {t('Delete permanently')}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.items.length && (
          <div className="empty-state">
            <History size={32} />
            <h3>{t('No activity yet')}</h3>
          </div>
        )}
        <Pager offset={offset} total={data.total} setOffset={setOffset} />
      </section>
    </>
  );
}
