// src/UserProfile.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import defaultAvatar from './assets/default-avatar.png';
import Cropper from 'react-easy-crop';
import Modal from '@mui/material/Modal';
import Slider from '@mui/material/Slider';
import { getCroppedImg } from './utils/cropImage';

export default function UserProfile() {
  const token       = localStorage.getItem('token');
  const decoded     = token ? jwtDecode(token) : {};
  const email       = decoded?.sub  || 'Unknown';
  const role        = decoded?.role || 'user';
  const navigate    = useNavigate();
  const { t }       = useTranslation();

  /* ── state ───────────────────────────────────────────── */
  const [fullName, setFullName]         = useState('');
  const [newName,  setNewName]          = useState('');
  const [editingName, setEditingName]   = useState(false);
  const [createdAt, setCreatedAt]       = useState(null);
  const [isVerified, setIsVerified]     = useState(false);

  const [changingPw, setChangingPw]     = useState(false);
  const [currPw, setCurrPw]             = useState('');
  const [newPw,  setNewPw]              = useState('');

  const [profileUrl, setProfileUrl]     = useState(null);
  const [imageSrc,  setImageSrc]        = useState(null);
  const [crop,      setCrop]            = useState({ x:0, y:0 });
  const [zoom,      setZoom]            = useState(1);
  const [areaPx,    setAreaPx]          = useState(null);
  const [open,      setOpen]            = useState(false);
  const fileRef = useRef(null);

  /* ── initial fetch ───────────────────────────────────── */
  useEffect(()=>{
    axios.get('/me',{headers:{Authorization:`Bearer ${token}`}})
         .then(r=>{
            const u=r.data;
            if(u.profile_picture) setProfileUrl(`${axios.defaults.baseURL}${u.profile_picture}`);
            if(u.full_name)       setFullName(u.full_name);
            if(u.created_at)      setCreatedAt(new Date(u.created_at).toLocaleString());
            if(typeof u.is_verified==='boolean') setIsVerified(u.is_verified);
          })
          .catch(e=>console.error('fetch user failed',e));
  },[token]);

  /* ── avatar crop / upload ────────────────────────────── */
  const openCropper = f=>{
    setImageSrc(URL.createObjectURL(f)); setOpen(true);
  };
  const saveCrop = async()=>{
    try{
      const img = await getCroppedImg(imageSrc,areaPx);
      const blob= await fetch(img).then(r=>r.blob());
      const fd  = new FormData(); fd.append('file',blob,'avatar.png');
      const res = await axios.patch('/me/profile-picture',fd,{headers:{
        Authorization:`Bearer ${token}`,'Content-Type':'multipart/form-data'}});
      setProfileUrl(`${axios.defaults.baseURL}${res.data.profile_picture}`);
      setOpen(false);
    }catch(e){ console.error(e); alert(t('Upload failed.')); }
  };

  /* ── name / password / delete handlers ───────────────── */
  const updateName = async()=>{
    if(!newName.trim()) return;
    await axios.patch('/me/full-name',{full_name:newName},{
      headers:{Authorization:`Bearer ${token}`}});
    alert(t('Name updated!')); setFullName(newName);
    setEditingName(false); setNewName('');
  };

  const changePw = async()=>{
    if(!currPw||!newPw) {alert(t('Enter passwords'));return;}
    try{
      await axios.patch('/me/password',{current_password:currPw,new_password:newPw},{
        headers:{Authorization:`Bearer ${token}`}});
      alert(t('Password changed!'));
      setChangingPw(false); setCurrPw(''); setNewPw('');
    }catch(e){ alert(e.response?.data?.detail || t('Password change failed.')); }
  };

  const deleteAcc = async()=>{
    const pw=prompt(t('Confirm delete prompt'));
    if(!pw) return;
    try{
      await axios.delete('/me',{headers:{Authorization:`Bearer ${token}`},data:{password:pw}});
      alert(t('Account deleted.'));
      localStorage.removeItem('token'); navigate('/');
    }catch(e){ alert(e.response?.data?.detail || t('Account deletion failed.')); }
  };

  /* ── render ──────────────────────────────────────────── */
  return (
    <div style={{padding:'2rem',display:'flex',flexDirection:'column',alignItems:'center'}}>
      <h2>{t('User Profile')}</h2>

      {/* avatar */}
      <div
        onClick={()=>fileRef.current.click()}
        title={t('Change avatar')}
        style={{
          width:120,height:120,borderRadius:'50%',cursor:'pointer',
          background:`url(${profileUrl||defaultAvatar}) center/cover`
        }}
      />
      <input type="file" accept="image/*" ref={fileRef}
             onChange={e=>e.target.files[0]&&openCropper(e.target.files[0])}
             style={{display:'none'}}/>

      {/* info card */}
      <div style={{border:'1px solid gray',padding:'1rem 2rem',borderRadius:8,minWidth:300,margin:'1rem 0'}}>
        <p><strong>{t('Email:')}</strong> {email}</p>
        <p><strong>{t('Role:')}</strong> {role}</p>
        <p><strong>{t('Full Name:')}</strong> {fullName||t('N/A')}</p>
        <p><strong>{t('Account Created:')}</strong> {createdAt||t('N/A')}</p>
        <p>
          <strong>{t('Email Verified:')}</strong>{' '}
          <span style={{color:isVerified?'green':'red'}}>
            {isVerified ? t('Yes') : t('No')}
          </span>
        </p>

        {/* name edit */}
        {!editingName ? (
          <button onClick={()=>{setNewName(fullName);setEditingName(true);}} style={{marginTop:10}}>
            {t('Change Name')}
          </button>
        ) : (
          <div style={{marginTop:10}}>
            <input value={newName} onChange={e=>setNewName(e.target.value)}
                   placeholder={t('Enter new name')} style={{padding:5,marginRight:8}}/>
            <button onClick={updateName}>{t('Save')}</button>{' '}
            <button onClick={()=>setEditingName(false)}>{t('Cancel')}</button>
          </div>
        )}
      </div>

      {/* password */}
      {!changingPw ? (
        <button onClick={()=>setChangingPw(true)} style={{marginBottom:10}}>
          {t('Change Password')}
        </button>
      ) : (
        <div style={{marginBottom:10}}>
          <input type="password" placeholder={t('Current Password')}
                 value={currPw} onChange={e=>setCurrPw(e.target.value)}
                 style={{padding:5,marginBottom:4,width:'100%'}}/>
          <input type="password" placeholder={t('New Password')}
                 value={newPw} onChange={e=>setNewPw(e.target.value)}
                 style={{padding:5,marginBottom:4,width:'100%'}}/>
          <button onClick={changePw}>{t('Save')}</button>{' '}
          <button onClick={()=>{setChangingPw(false);setCurrPw('');setNewPw('');}}>
            {t('Cancel')}
          </button>
        </div>
      )}

      {/* delete */}
      <button onClick={deleteAcc}
              style={{background:'red',color:'#fff',marginBottom:10}}>
        {t('Delete Account')}
      </button>

      <button onClick={()=>navigate('/dashboard')}>
        {t('Back to Dashboard')}
      </button>

      {/* crop modal */}
      <Modal open={open} onClose={()=>setOpen(false)}>
        <div style={{
          position:'absolute',top:'50%',left:'50%',
          transform:'translate(-50%,-50%)',
          background:'#fff',padding:16,borderRadius:8,width:'90%',maxWidth:400
        }}>
          <h3>{t('Crop Image')}</h3>
          <div style={{position:'relative',width:'100%',height:300}}>
            <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1}
                     onCropChange={setCrop}
                     onCropComplete={(_,area)=>setAreaPx(area)}
                     onZoomChange={setZoom}/>
          </div>
          <Slider value={zoom} min={1} max={3} step={0.1}
                  onChange={(_,z)=>setZoom(z)} style={{margin:'1rem 0'}}/>
          <button onClick={saveCrop} style={{marginRight:8}}>{t('Save')}</button>
          <button onClick={()=>setOpen(false)}>{t('Cancel')}</button>
        </div>
      </Modal>
    </div>
  );
}
