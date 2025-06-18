// src/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios      from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode as decode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';

/* one place for the API root */
axios.defaults.baseURL = 'http://127.0.0.1:8000';

/* ––––– helper to fetch a preview once and memoise it ––––– */
const previewCache = {};   // id → object-URL
async function getPreviewURL(id, mime, token) {
  if (previewCache[id]) return previewCache[id];
  const res = await axios.get(`/download/${id}?inline=true`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  });
  const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
  previewCache[id] = url;
  return url;
}
/* ———————————————————————————————————————————————— */

export default function Dashboard() {
  /* basic state */
  const [files, setFiles]       = useState([]);
  const [usage, setUsage]       = useState(0);
  const [verified, setVer]      = useState(true);
  const [uploadFile, setUpload] = useState(null);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');

  /* search / sort */
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [sort,  setSort ] = useState('date');
  const [order, setOrder] = useState('desc');

  /* dark / light – read once from localStorage */
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  /* i18n / nav / auth */
  const { t, i18n } = useTranslation();
  const nav   = useNavigate();
  const token = localStorage.getItem('token');
  const me    = token ? decode(token) : {};
  const isAdmin = me.role === 'admin';

  /* allow aborting previous fetch when user types fast */
  const ctrlRef = useRef(null);

  /* apply theme on mount & when toggled */
  useEffect(() => {
    document.body.className = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  /* redirect if token missing */
  useEffect(() => { if (!token) nav('/'); }, [token, nav]);

  /* unified fetch */
  const fetchAll = useCallback(async () => {
    if (!token) return;

    /* cancel previous request */
    if (ctrlRef.current) ctrlRef.current.abort();
    const ctrl = new AbortController(); ctrlRef.current = ctrl;
    const auth = { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal };

    try {
      const [meRes, flRes, usRes] = await Promise.all([
        axios.get('/me',                            auth),
        axios.get(`/files?search=${encodeURIComponent(query)}&sort_by=${sort}&order=${order}`, auth),
        axios.get('/storage-usage',                 auth)
      ]);
      setVer(meRes.data.is_verified);
      setFiles(flRes.data);
      setUsage(usRes.data.used_mb);
      setErr('');
    } catch (e) {
      if (!axios.isCancel(e)) { console.error(e); setErr('Fetch failed'); }
    }
  }, [token, query, sort, order]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* upload */
  const doUpload = async e => {
    e.preventDefault();
    if (!uploadFile || !verified) return;
    const fd = new FormData(); fd.append('upload_file', uploadFile);
    try {
      await axios.post('/upload', fd, {
        headers: { Authorization:`Bearer ${token}`, 'Content-Type':'multipart/form-data' }
      });
      setMsg(t('Upload successful!')); setUpload(null); fetchAll();
    } catch { setMsg(t('Upload failed.')); }
  };

  /* download / delete */
  const download = async (id, name) => {
    try {
      const blob = (await axios.get(`/download/${id}`, {
        headers:{ Authorization:`Bearer ${token}` }, responseType:'blob'
      })).data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } catch { alert(t('Download failed')); }
  };
  const del = async id => {
    await axios.delete(`/files/${id}`, { headers:{ Authorization:`Bearer ${token}` } });
    fetchAll();
  };

  /* categorise */
  const cats = { images:[], videos:[], others:[] };
  files.forEach(f => {
    if (f.file_type.startsWith('image/'))      cats.images.push(f);
    else if (f.file_type.startsWith('video/')) cats.videos.push(f);
    else                                       cats.others.push(f);
  });

  /* JSX */
  return (
    <div style={{ padding:32 }}>
      {/* header */}
      <header style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <strong>{t('Logged in as')}:</strong> {me.email || me.sub || '?'}{' '}
          | <a href="/profile">{t('Profile')}</a>
          {isAdmin && <> | <a href="/admin/audit">Audit</a></>}
          | <button onClick={()=>{ localStorage.removeItem('token'); nav('/'); }}>
              {t('Logout')}
            </button>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select defaultValue={i18n.language}
                  onChange={e => i18n.changeLanguage(e.target.value)}>
            <option value="en">EN</option><option value="ro">RO</option>
          </select>
          <button onClick={() => setDark(d => !d)}>
            {dark ? t('Light') : t('Dark')}
          </button>
        </div>
      </header>

      {/* usage bar */}
      <p><strong>{t('Storage Used')}:</strong> {usage.toFixed(2)} MB / 100 MB</p>
      <div style={{ background:'#ddd', height:10, borderRadius:4, overflow:'hidden', marginBottom:20 }}>
        <div style={{
          width:`${Math.min(usage,100)}%`,
          height:'100%',
          background: usage >= 100 ? 'red' : '#4caf50'
        }}/>
      </div>

      {!verified && <p style={{ color:'red' }}>{t('Please verify your email to upload files.')}</p>}

      {/* upload */}
      <form onSubmit={doUpload} style={{ marginBottom:20 }}>
        <input id="fileInput" type="file" hidden disabled={!verified}
               onChange={e=>setUpload(e.target.files[0])}/>
        <button type="button" disabled={!verified}
                onClick={()=>document.getElementById('fileInput').click()}>
          {t('Choose File')}
        </button>
        {uploadFile && <span style={{ margin:'0 10px' }}>{uploadFile.name}</span>}
        <button type="submit" disabled={!verified}>{t('Upload')}</button>
      </form>

      {/* search / sort */}
      <div style={{ marginBottom:20 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
               placeholder={t('Search files...')}/>
        <button onClick={()=>setQuery(input)} style={{ marginLeft:8 }}>{t('Search')}</button>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{ marginLeft:12 }}>
          <option value="date">{t('Sort by Date')}</option>
          <option value="name">{t('Sort by Name')}</option>
          <option value="size">{t('Sort by Size')}</option>
        </select>
        <select value={order} onChange={e=>setOrder(e.target.value)} style={{ marginLeft:6 }}>
          <option value="desc">↓</option>
          <option value="asc">↑</option>
        </select>
      </div>

      {msg && <p>{msg}</p>}
      {err && <p style={{ color:'red' }}>{err}</p>}

      {/* categories */}
      {['images', 'videos', 'others'].map(cat => (
        <section key={cat} style={{ marginBottom:32 }}>
          <h3 style={{ textTransform:'capitalize' }}>{cat}</h3>
          {cats[cat].length === 0
            ? <p>{t('No files found.')}</p>
            : cats[cat].map(f => (
                <FileCard key={f.id} file={f} cat={cat} token={token}
                          onDownload={download} onDelete={del} t={t}/>
              ))}
        </section>
      ))}
    </div>
  );
}

/* sub-component for single file */
function FileCard({ file, cat, token, onDownload, onDelete, t }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (cat==='images' || cat==='videos') {
      getPreviewURL(file.id, file.file_type, token).then(setPreview);
    }
  }, [cat, file.id, file.file_type, token]);

  return (
    <div style={{ marginBottom:18 }}>
      <p><strong>{file.filename}</strong> ({file.size})</p>

      {cat==='images' && preview && (
        <img src={preview} alt="" style={{ maxWidth:300, maxHeight:200, display:'block', marginBottom:6 }}/>
      )}
      {cat==='videos' && preview && (
        <video src={preview} controls width="300"
               style={{ display:'block', marginBottom:6 }}/>
      )}

      <button onClick={()=>onDownload(file.id, file.filename)}>{t('Download')}</button>{' '}
      <button onClick={()=>onDelete(file.id)}>{t('Delete')}</button>
    </div>
  );
}
