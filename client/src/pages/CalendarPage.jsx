import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTasks } from '../hooks/useTasks';
import Modal from '../components/Modal';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import Button from '../components/Button';

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateKey(key) {
  if (!key) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const days = [];
  for (let i = 0; i < 42; i += 1) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

function CalendarPage() {
  const { allTasks, updateTask, deleteTask } = useTasks();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const tasksByDate = useMemo(() => {
    const map = new Map();
    allTasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = task.dueDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    });
    return map;
  }, [allTasks]);

  const undated = allTasks.filter((task) => !task.dueDate).length;
  const days = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const todayKey = toDateKey(new Date());

  function goToPrevMonth() {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function goToToday() {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  function openEdit(task) {
    setSelectedDateKey(null);
    setEditingTask(task);
    setFormOpen(true);
  }

  async function handleEditSubmit(payload) {
    try {
      await updateTask(editingTask._id, payload);
      toast.success('Tarea actualizada');
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

  const selectedTasks = selectedDateKey ? tasksByDate.get(selectedDateKey) || [] : [];
  const monthLabel = cursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold capitalize text-slate-900">{monthLabel}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToPrevMonth} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Hoy
          </Button>
          <Button variant="outline" onClick={goToNextMonth} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date) => {
            const key = toDateKey(date);
            const inMonth = date.getMonth() === cursor.getMonth();
            const dayTasks = tasksByDate.get(key) || [];
            const isToday = key === todayKey;

            return (
              <button
                key={key}
                type="button"
                disabled={dayTasks.length === 0}
                onClick={() => setSelectedDateKey(key)}
                className={`flex h-20 flex-col items-center justify-start gap-1 border-b border-r border-slate-100 p-2 text-sm ${
                  inMonth ? 'text-slate-700' : 'text-slate-300'
                } ${dayTasks.length > 0 ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white' : ''
                  }`}
                >
                  {date.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    {dayTasks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {undated > 0 && (
        <p className="mt-3 text-sm text-slate-400">
          {undated} {undated === 1 ? 'tarea' : 'tareas'} sin fecha límite no se{' '}
          {undated === 1 ? 'muestra' : 'muestran'} aquí.
        </p>
      )}

      <Modal
        open={Boolean(selectedDateKey)}
        onClose={() => setSelectedDateKey(null)}
        title={formatDateKey(selectedDateKey)}
      >
        <div className="flex flex-col gap-3">
          {selectedTasks.length === 0 ? (
            <p className="text-sm text-slate-400">No hay tareas este día.</p>
          ) : (
            selectedTasks.map((task) => (
              <TaskCard key={task._id} task={task} onEdit={openEdit} onDelete={handleDelete} />
            ))
          )}
        </div>
      </Modal>

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleEditSubmit}
        initialTask={editingTask}
      />
    </div>
  );
}

export default CalendarPage;
