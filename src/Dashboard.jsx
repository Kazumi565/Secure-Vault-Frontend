import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from './api/client';
import tokenService from './api/tokenService';
import useAutoLogout from './hooks/useAutoLogout';
import { USE_HTTP_ONLY_COOKIE } from './config';

const previewCache = new Map();

async function getPreviewURL(id, mime) {
  if (previewCache.has(id)) {
    return previewCache.get(id);
  }
  const blob = await apiClient.get(`/download/${id}?inline=true`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([blob], { type: mime }));
  previewCache.set(id, url);
  return url;
}

export default function Dashboard() {
  useAutoLogout();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [usage, setUsage] = useState(0);
  const [verified, setVerified] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const controllerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.body.className = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    if (!USE_HTTP_ONLY_COOKIE && !tokenService.getToken()) {
      navigate('/');
    }
  }, [navigate]);

  const fetchData = useCallback(async () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const [profile, fileList, storage] = await Promise.all([
        apiClient.get('/me', { signal: controller.signal }),
        apiClient.get(`/files?search=${encodeURIComponent(query)}&sort_by=${sort}&order=${order}`, {
          signal: controller.signal
        }),
        apiClient.get('/storage-usage', { signal: controller.signal })
      ]);
      setUser(profile);
      setVerified(Boolean(profile?.is_verified));
      setFiles(fileList);
      setUsage(storage?.used_mb || 0);
      setErr('');
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error(error);
      setErr(error?.message || t('Fetch failed'));
    }
  }, [order, query, sort, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const doUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !verified) return;
    const fd = new FormData();
    fd.append('upload_file', uploadFile);
    try {
      await apiClient.post('/upload', fd);
      setMsg(t('Upload successful!'));
      setUploadFile(null);
      fetchData();
    } catch (error) {
      setMsg(error?.data?.detail || t('Upload failed.'));
    }
  };

  const download = async (id, name) => {
    try {
      const blob = await apiClient.get(`/download/${id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(t('Download failed'));
    }
  };

  const del = async (id) => {
    try {
      await apiClient.delete(`/files/${id}`);
      fetchData();
    } catch (error) {
      alert(error?.data?.detail || t('Delete failed.'));
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/logout', null);
    } catch (error) {
      console.warn('Failed to call logout endpoint', error);
    }
    tokenService.logout();
    navigate('/');
  };

  const categories = { images: [], videos: [], others: [] };
  files.forEach((f) => {
    if (f.file_type?.startsWith('image/')) categories.images.push(f);
    else if (f.file_type?.startsWith('video/')) categories.videos.push(f);
    else categories.others.push(f);
  });

  return (
    <div style={{ padding: 32 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <strong>{t('Logged in as:')}</strong> {user?.email || user?.full_name || '—'}{' '}
          | <button onClick={() => navigate('/profile')}>{t('Profile')}</button>
          {user?.role === 'admin' && (
            <>
              {' '}
              | <button onClick={() => navigate('/admin/audit')}>{t('Admin audit')}</button>
            </>
          )}
          {' | '}
          <button onClick={logout}>{t('Logout')}</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select defaultValue={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
            <option value="en">EN</option>
            <option value="ro">RO</option>
          </select>
          <button onClick={() => setDark((d) => !d)}>{dark ? t('Light') : t('Dark')}</button>
        </div>
      </header>

      <p>
        <strong>{t('Storage Used')}:</strong> {usage.toFixed(2)} MB / 100 MB
      </p>
      <div style={{ background: '#ddd', height: 10, borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
        <div
          style={{
            width: `${Math.min(usage, 100)}%`,
            height: '100%',
            background: usage >= 100 ? 'red' : '#4caf50'
          }}
        />
      </div>

      {!verified && <p style={{ color: 'red' }}>{t('Please verify your email to upload files.')}</p>}

      <form onSubmit={doUpload} style={{ marginBottom: 20 }}>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          disabled={!verified}
          onChange={(e) => setUploadFile(e.target.files[0])}
        />
        <button type="button" disabled={!verified} onClick={() => fileInputRef.current?.click()}>
          {t('Choose File')}
        </button>
        {uploadFile && <span style={{ margin: '0 10px' }}>{uploadFile.name}</span>}
        <button type="submit" disabled={!verified}>
          {t('Upload')}
        </button>
      </form>

      <div style={{ marginBottom: 20 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('Search files...')} />
        <button onClick={() => setQuery(input)} style={{ marginLeft: 8 }}>
          {t('Search')}
        </button>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ marginLeft: 12 }}>
          <option value="date">{t('Sort by Date')}</option>
          <option value="name">{t('Sort by Name')}</option>
          <option value="size">{t('Sort by Size')}</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value)} style={{ marginLeft: 6 }}>
          <option value="desc">↓</option>
          <option value="asc">↑</option>
        </select>
      </div>

      {msg && <p>{msg}</p>}
      {err && <p style={{ color: 'red' }}>{err}</p>}

      {['images', 'videos', 'others'].map((cat) => (
        <section key={cat} style={{ marginBottom: 32 }}>
          <h3 style={{ textTransform: 'capitalize' }}>{cat}</h3>
          {categories[cat].length === 0 ? (
            <p>{t('No files found.')}</p>
          ) : (
            categories[cat].map((file) => (
              <FileCard key={file.id} file={file} cat={cat} onDownload={download} onDelete={del} />
            ))
          )}
        </section>
      ))}
    </div>
  );
}

function FileCard({ file, cat, onDownload, onDelete }) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (cat === 'images' || cat === 'videos') {
      getPreviewURL(file.id, file.file_type)
        .then((url) => {
          if (mounted) setPreview(url);
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [cat, file.id, file.file_type]);

  return (
    <div style={{ marginBottom: 18 }}>
      <p>
        <strong>{file.filename}</strong> ({file.size})
      </p>

      {cat === 'images' && preview && (
        <img src={preview} alt="" style={{ maxWidth: 300, maxHeight: 200, display: 'block', marginBottom: 6 }} />
      )}
      {cat === 'videos' && preview && (
        <video src={preview} controls width="300" style={{ display: 'block', marginBottom: 6 }} />
      )}

      <button onClick={() => onDownload(file.id, file.filename)}>{t('Download')}</button>{' '}
      <button onClick={() => onDelete(file.id)}>{t('Delete')}</button>
    </div>
  );
}
