import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';

axios.defaults.baseURL = 'http://127.0.0.1:8000';

export default function AdminAudit() {
  /* ───────── state ───────── */
  const [logs,  setLogs]  = useState([]);
  const [files, setFiles] = useState([]);   // full list, cached
  const [msg,   setMsg]   = useState('');

  /* ───────── helpers ─────── */
  const token   = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : {};
  const nav     = useNavigate();
  const { t }   = useTranslation();

  /* guard-rail: non-admins → dashboard */
  useEffect(() => {
    if (decoded.role !== 'admin') nav('/dashboard');
  }, [decoded, nav]);

  /* initial fetch */
  useEffect(() => {
    (async () => {
      try {
        const [{ data: lg }, { data: fl }] = await Promise.all([
          axios.get('/admin/audit', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/admin/files', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setLogs(lg);
        setFiles(fl);
      } catch {
        setMsg(t('Failed to fetch audit logs'));
      }
    })();
  }, [token, t]);

  /* pretty helper – strip “Uploaded file:” … */
  const extractFilename = action => {
    return action.replace(/^Uploaded file:\s*/i, '').split('|')[0].trim();
  };

  /* DELETE click */
  const handleDelete = async action => {
    const fname = extractFilename(action);
    const file = files.find(f => f.filename === fname);

    if (!file) {
      alert(t('File not found'));
      return;
    }

    try {
      await axios.delete(`/admin/files/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setLogs(l => l.filter(r => r !== action));
      setFiles(f => f.filter(f => f.id !== file.id));
      setMsg(t('File deleted.'));
    } catch {
      alert(t('Admin delete failed'));
    }
  };

  /* CSV export */
  const exportCSV = async () => {
    try {
      const res = await axios.get('/admin/audit/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      saveAs(res.data, `audit-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      console.error('CSV export error:', err?.response ?? err);
      alert(t('CSV export failed'));
    }
  };

  /* ───────── UI ───────── */
  return (
    <div style={{ padding: '2rem' }}>
      <button onClick={() => nav('/dashboard')} style={{ marginBottom: '1rem' }}>
        ← {t('Back to Dashboard')}
      </button>

      <h2>{t('Audit Log (Admin)')}</h2>

      <button onClick={exportCSV} style={{ marginBottom: 8 }}>
        {t('Export CSV')}
      </button>

      {msg && <p>{msg}</p>}

      <table border="1" cellPadding="6" style={{ width: '100%', maxWidth: 900 }}>
        <thead>
          <tr>
            <th>{t('Time')}</th>
            <th>{t('User')}</th>
            <th>{t('Action')}</th>
            <th>{t('Delete')}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{typeof log.user === 'string' ? log.user : log.user?.email ?? 'UNKNOWN'}</td>
              <td>{log.action}</td>
              <td style={{ textAlign: 'center' }}>
                {log.action.startsWith('Uploaded file:') && (
                  <button onClick={() => handleDelete(log.action)}>
                    {t('Delete file')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
