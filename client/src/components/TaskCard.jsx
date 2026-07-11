import { Pencil, Trash2 } from 'lucide-react';
import Badge from './Badge';

const STATUS_LABELS = { pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada' };
const STATUS_COLORS = { pendiente: 'slate', en_progreso: 'blue', completada: 'emerald' };
const PRIORITY_LABELS = { baja: 'Baja', media: 'Media', alta: 'Alta' };
const PRIORITY_COLORS = { baja: 'slate', media: 'amber', alta: 'rose' };

function TaskCard({ task, onEdit, onDelete }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2">
        <h3 className="font-medium text-slate-900">{task.title}</h3>
        {task.description && <p className="text-sm text-slate-500">{task.description}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Badge>
          <Badge color={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
          {task.dueDate && (
            <span className="text-xs text-slate-400">
              Vence: {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
          aria-label="Editar tarea"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
          aria-label="Eliminar tarea"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default TaskCard;
