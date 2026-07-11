import { useCallback, useEffect, useState } from 'react';
import * as tasksApi from '../api/tasksApi';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );
      const data = await tasksApi.listTasks(activeFilters);
      setTasks(data);
    } catch {
      setError('No se pudieron cargar las tareas');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Total sin filtrar, para mostrar contadores del dashboard que no cambian con el filtro activo.
  const fetchAllTasks = useCallback(async () => {
    try {
      const data = await tasksApi.listTasks();
      setAllTasks(data);
    } catch {
      // los contadores simplemente no se actualizan; el listado principal ya muestra el error
    }
  }, []);

  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  async function createTask(payload) {
    const task = await tasksApi.createTask(payload);
    setTasks((prev) => [task, ...prev]);
    setAllTasks((prev) => [task, ...prev]);
    return task;
  }

  async function updateTask(id, payload) {
    const task = await tasksApi.updateTask(id, payload);
    setTasks((prev) => prev.map((t) => (t._id === id ? task : t)));
    setAllTasks((prev) => prev.map((t) => (t._id === id ? task : t)));
    return task;
  }

  async function deleteTask(id) {
    await tasksApi.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t._id !== id));
    setAllTasks((prev) => prev.filter((t) => t._id !== id));
  }

  return {
    tasks,
    allTasks,
    loading,
    error,
    filters,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,
  };
}
