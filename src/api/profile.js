import apiClient from './client';

export function fetchProfile() {
  return apiClient.get('/me');
}

export function updateFullName(full_name) {
  return apiClient.patch('/me/full-name', { full_name });
}

export function changePassword(current_password, new_password) {
  return apiClient.patch('/me/password', { current_password, new_password });
}

export function deleteAccount(password) {
  return apiClient.delete('/me', { body: { password } });
}

export function uploadProfilePicture(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.patch('/me/profile-picture', formData);
}
