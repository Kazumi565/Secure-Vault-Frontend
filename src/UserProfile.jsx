import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Modal from '@mui/material/Modal';
import Slider from '@mui/material/Slider';
import Cropper from 'react-easy-crop';
import defaultAvatar from './assets/default-avatar.png';
import { getCroppedImg } from './utils/cropImage';
import {
  fetchProfile,
  updateFullName,
  changePassword,
  deleteAccount,
  uploadProfilePicture
} from './api/profile';
import tokenService from './api/tokenService';
import apiClient from './api/client';
import useAutoLogout from './hooks/useAutoLogout';
import { API_URL } from './config';

function absoluteProfileUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}

export default function UserProfile() {
  useAutoLogout();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [newName, setNewName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [createdAt, setCreatedAt] = useState(null);
  const [isVerified, setIsVerified] = useState(false);

  const [changingPw, setChangingPw] = useState(false);
  const [currPw, setCurrPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const [profileUrl, setProfileUrl] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProfile();
        setProfile(data);
        setFullName(data.full_name || '');
        setCreatedAt(data.created_at ? new Date(data.created_at).toLocaleString() : null);
        setIsVerified(Boolean(data.is_verified));
        if (data.profile_picture) {
          setProfileUrl(absoluteProfileUrl(data.profile_picture));
        }
      } catch (error) {
        console.error('fetch user failed', error);
      }
    };
    load();
  }, []);

  const openCropper = (file) => {
    setImageSrc(URL.createObjectURL(file));
    setOpen(true);
  };

  const saveCrop = async () => {
    try {
      const img = await getCroppedImg(imageSrc, areaPx);
      const blob = await fetch(img).then((r) => r.blob());
      const file = new File([blob], 'avatar.png', { type: blob.type || 'image/png' });
      const res = await uploadProfilePicture(file);
      setProfileUrl(absoluteProfileUrl(res.profile_picture));
      setOpen(false);
    } catch (error) {
      console.error(error);
      alert(t('Upload failed.'));
    }
  };

  const updateName = async () => {
    if (!newName.trim()) return;
    try {
      await updateFullName(newName);
      setFullName(newName);
      setEditingName(false);
      setNewName('');
      alert(t('Name updated!'));
    } catch (error) {
      alert(error?.data?.detail || t('Name update failed.'));
    }
  };

  const changePw = async () => {
    if (!currPw || !newPw) {
      alert(t('Enter passwords'));
      return;
    }
    try {
      await changePassword(currPw, newPw);
      alert(t('Password changed!'));
      setChangingPw(false);
      setCurrPw('');
      setNewPw('');
    } catch (error) {
      alert(error?.data?.detail || t('Password change failed.'));
    }
  };

  const deleteAcc = async () => {
    const pw = prompt(t('Confirm delete prompt'));
    if (!pw) return;
    try {
      await deleteAccount(pw);
      alert(t('Account deleted.'));
      tokenService.logout();
      navigate('/');
    } catch (error) {
      alert(error?.data?.detail || t('Account deletion failed.'));
    }
  };

  const resendVerification = async () => {
    try {
      await apiClient.post('/resend-verification', null);
      alert(t('Verification email sent.'));
    } catch (error) {
      alert(error?.data?.detail || t('Verification email failed.'));
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2>{t('User Profile')}</h2>

      <div
        onClick={() => fileRef.current.click()}
        title={t('Change avatar')}
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          cursor: 'pointer',
          background: `url(${profileUrl || defaultAvatar}) center/cover`
        }}
      />
      <input
        type="file"
        accept="image/*"
        ref={fileRef}
        onChange={(e) => e.target.files[0] && openCropper(e.target.files[0])}
        style={{ display: 'none' }}
      />

      <div style={{ border: '1px solid gray', padding: '1rem 2rem', borderRadius: 8, minWidth: 300, margin: '1rem 0' }}>
        <p>
          <strong>{t('Email:')}</strong> {profile?.email || 'Unknown'}
        </p>
        <p>
          <strong>{t('Role:')}</strong> {profile?.role || 'user'}
        </p>
        <p>
          <strong>{t('Full Name:')}</strong> {fullName || t('N/A')}
        </p>
        <p>
          <strong>{t('Account Created:')}</strong> {createdAt || t('N/A')}
        </p>
        <p>
          <strong>{t('Email Verified:')}</strong>{' '}
          <span style={{ color: isVerified ? 'green' : 'red' }}>{isVerified ? t('Yes') : t('No')}</span>
        </p>
        {!isVerified && (
          <button onClick={resendVerification} style={{ marginTop: 8 }}>
            {t('Resend verification email')}
          </button>
        )}

        {!editingName ? (
          <button onClick={() => { setNewName(fullName); setEditingName(true); }} style={{ marginTop: 10 }}>
            {t('Change Name')}
          </button>
        ) : (
          <div style={{ marginTop: 10 }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('Enter new name')} style={{ padding: 5, marginRight: 8 }} />
            <button onClick={updateName}>{t('Save')}</button>{' '}
            <button onClick={() => setEditingName(false)}>{t('Cancel')}</button>
          </div>
        )}
      </div>

      {!changingPw ? (
        <button onClick={() => setChangingPw(true)} style={{ marginBottom: 10 }}>
          {t('Change Password')}
        </button>
      ) : (
        <div style={{ marginBottom: 10 }}>
          <input
            type="password"
            placeholder={t('Current Password')}
            value={currPw}
            onChange={(e) => setCurrPw(e.target.value)}
            style={{ padding: 5, marginBottom: 4, width: '100%' }}
          />
          <input
            type="password"
            placeholder={t('New Password')}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            style={{ padding: 5, marginBottom: 4, width: '100%' }}
          />
          <button onClick={changePw}>{t('Save')}</button>{' '}
          <button
            onClick={() => {
              setChangingPw(false);
              setCurrPw('');
              setNewPw('');
            }}
          >
            {t('Cancel')}
          </button>
        </div>
      )}

      <button onClick={deleteAcc} style={{ background: 'red', color: '#fff', marginBottom: 10 }}>
        {t('Delete Account')}
      </button>

      <button onClick={() => navigate('/dashboard')}>{t('Back to Dashboard')}</button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            padding: 16,
            borderRadius: 8,
            width: '90%',
            maxWidth: 400
          }}
        >
          <h3>{t('Crop Image')}</h3>
          <div style={{ position: 'relative', width: '100%', height: 300 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={(_, area) => setAreaPx(area)}
              onZoomChange={setZoom}
            />
          </div>
          <Slider value={zoom} min={1} max={3} step={0.1} onChange={(_, z) => setZoom(z)} style={{ margin: '1rem 0' }} />
          <button onClick={saveCrop} style={{ marginRight: 8 }}>
            {t('Save')}
          </button>
          <button onClick={() => setOpen(false)}>{t('Cancel')}</button>
        </div>
      </Modal>
    </div>
  );
}
