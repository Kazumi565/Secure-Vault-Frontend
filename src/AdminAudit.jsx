import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import apiClient from './api/client';
import useAutoLogout from './hooks/useAutoLogout';

export default function AdminAudit() {
  useAutoLogout();
  const [logs, setLogs] = useState([]);
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const profile = await apiClient.get('/me');
        if (profile?.role !== 'admin') {
          navigate('/dashboard');
          return;
        }
        const [auditLogs, fileList] = await Promise.all([
          apiClient.get('/admin/audit'),
          apiClient.get('/admin/files')
        ]);
        setLogs(auditLogs);
        setFiles(fileList);
        setMsg('');
      } catch (error) {
        setMsg(error?.message || t('Failed to fetch audit logs'));
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [navigate, t]);

  const extractFilename = (action) => action.replace(/^Uploaded file:\s*/i, '').split('|')[0].trim();

  const handleDelete = async (action) => {
    const fname = extractFilename(action);
    const file = files.find((f) => f.filename === fname);

    if (!file) {
      alert(t('File not found'));
      return;
    }

    try {
      await apiClient.delete(`/admin/files/${file.id}`);
      setLogs((prev) => prev.filter((log) => log !== action));
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setMsg(t('File deleted.'));
    } catch (error) {
      alert(error?.data?.detail || t('Admin delete failed'));
    }
  };

  const exportCSV = async () => {
    try {
      const blob = await apiClient.get('/admin/audit/export', { responseType: 'blob' });
      saveAs(blob, `audit-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      console.error('CSV export error:', error);
      alert(t('CSV export failed'));
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem' }}>
        ← {t('Back to Dashboard')}
      </button>

      <h2>{t('Audit Log (Admin)')}</h2>

      <button onClick={exportCSV} style={{ marginBottom: 8 }} disabled={loading}>
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
            <tr key={`${log.timestamp}-${i}`}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{typeof log.user === 'string' ? log.user : log.user?.email ?? 'UNKNOWN'}</td>
              <td>{log.action}</td>
              <td style={{ textAlign: 'center' }}>
                {log.action?.startsWith('Uploaded file:') && (
                  <button onClick={() => handleDelete(log.action)}>{t('Delete file')}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
