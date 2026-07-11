import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';

const EMPTY_FORM = { title: '', description: '', status: 'pendiente', priority: 'media', dueDate: '' };

function toFormState(task) {
  if (!task) return EMPTY_FORM;
  return {
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'pendiente',
    priority: task.priority || 'media',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
  };
}

function validate({ title }) {
  const errors = {};
  if (!title.trim()) errors.title = 'El título es requerido';
  return errors;
}

function TaskFormModal({ open, onClose, onSubmit, initialTask }) {
  const [form, setForm] = useState(toFormState(initialTask));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(initialTask));
      setErrors({});
    }
  }, [open, initialTask]);

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = { ...form, dueDate: form.dueDate || undefined };
      await onSubmit(payload);
      onClose();
    } catch {
      // el padre ya muestra un toast de error; el modal permanece abierto para reintentar
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initialTask ? 'Editar tarea' : 'Nueva tarea'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="title"
          label="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          error={errors.title}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-slate-700">
            Descripción
          </label>
          <textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-sm font-medium text-slate-700">
              Estado
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En progreso</option>
              <option value="completada">Completada</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="priority" className="text-sm font-medium text-slate-700">
              Prioridad
            </label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>
        <Input
          id="dueDate"
          label="Fecha límite"
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default TaskFormModal;
