import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import StatusBarChart from '../components/StatusBarChart';

function DashboardPage() {
  const {
    tasks,
    allTasks,
    loading,
    error,
    filters,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    refetch,
  } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const stats = {
    total: allTasks.length,
    pendiente: allTasks.filter((t) => t.status === 'pendiente').length,
    en_progreso: allTasks.filter((t) => t.status === 'en_progreso').length,
    completada: allTasks.filter((t) => t.status === 'completada').length,
  };

  function openCreateModal() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  async function handleSubmit(payload) {
    try {
      if (editingTask) {
        await updateTask(editingTask._id, payload);
        toast.success('Tarea actualizada');
      } else {
        await createTask(payload);
        toast.success('Tarea creada');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar la tarea');
      throw err;
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
    try {
      await deleteTask(task._id);
      toast.success('Tarea eliminada');
    } catch {
      toast.error('No se pudo eliminar la tarea');
    }
  }

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pendientes" value={stats.pendiente} />
        <StatCard label="En progreso" value={stats.en_progreso} color="blue" />
        <StatCard label="Completadas" value={stats.completada} color="emerald" />
      </div>

      <div className="mb-6">
        <StatusBarChart tasks={allTasks} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Mis tareas</h1>
        <Button onClick={openCreateModal} className="flex items-center gap-1">
          <Plus size={16} /> Nueva tarea
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_progreso">En progreso</option>
          <option value="completada">Completada</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
        >
          <option value="">Todas las prioridades</option>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </select>
      </div>

      {loading && <p className="text-slate-400">Cargando tareas...</p>}

      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}{' '}
          <button type="button" onClick={refetch} className="font-medium underline">
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <p className="text-slate-400">No tienes tareas todavía — crea la primera.</p>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onEdit={openEditModal} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialTask={editingTask}
      />
    </div>
  );
}

export default DashboardPage;
