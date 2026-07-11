import apiClient from './client';

export async function listTasks(filters = {}) {
  const { data } = await apiClient.get('/tasks', { params: filters });
  return data.tasks;
}

export async function createTask(payload) {
  const { data } = await apiClient.post('/tasks', payload);
  return data.task;
}

export async function updateTask(id, payload) {
  const { data } = await apiClient.put(`/tasks/${id}`, payload);
  return data.task;
}

export async function deleteTask(id) {
  await apiClient.delete(`/tasks/${id}`);
}
