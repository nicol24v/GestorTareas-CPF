import { useState } from 'react';
import { LogOut, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import StatusBarChart from '../components/StatusBarChart';

function DashboardPage() {
  const { user, logout } = useAuth();
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
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 bg-slate-900 p-6 text-slate-100 sm:flex">
        <h2 className="text-lg font-semibold">Gestor de Tareas</h2>
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="mb-1 text-slate-400">Estado</p>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En progreso</option>
              <option value="completada">Completada</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-slate-400">Prioridad</p>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
            >
              <option value="">Todas</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <span className="text-sm text-slate-500">Hola, {user?.name}</span>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-rose-600"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </header>

        <main className="flex-1 p-6">
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Pendientes" value={stats.pendiente} />
            <StatCard label="En progreso" value={stats.en_progreso} color="blue" />
            <StatCard label="Completadas" value={stats.completada} color="emerald" />
          </div>

          <div className="mb-6">
            <StatusBarChart tasks={allTasks} />
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-900">Mis tareas</h1>
            <Button onClick={openCreateModal} className="flex items-center gap-1">
              <Plus size={16} /> Nueva tarea
            </Button>
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
        </main>
      </div>

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
