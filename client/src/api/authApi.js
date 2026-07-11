import apiClient from './client';

export async function register({ name, email, password }) {
  const { data } = await apiClient.post('/auth/register', { name, email, password });
  return data;
}

export async function login({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function updateProfile({ name }) {
  const { data } = await apiClient.put('/auth/me', { name });
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await apiClient.put('/auth/password', { currentPassword, newPassword });
  return data;
}
