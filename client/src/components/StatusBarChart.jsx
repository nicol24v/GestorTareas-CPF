const STATUS_META = [
  { key: 'pendiente', label: 'Pendiente', barColor: 'bg-slate-300', dotColor: 'bg-slate-400' },
  { key: 'en_progreso', label: 'En progreso', barColor: 'bg-blue-500', dotColor: 'bg-blue-500' },
  { key: 'completada', label: 'Completada', barColor: 'bg-emerald-500', dotColor: 'bg-emerald-500' },
];

function StatusBarChart({ tasks }) {
  const counts = STATUS_META.map((meta) => ({
    ...meta,
    count: tasks.filter((t) => t.status === meta.key).length,
  }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-slate-700">Distribución por estado</h3>

      {total === 0 ? (
        <p className="text-sm text-slate-400">Sin tareas todavía.</p>
      ) : (
        <div className="flex h-3 gap-0.5">
          {counts
            .filter((c) => c.count > 0)
            .map((c) => (
              <div
                key={c.key}
                title={`${c.label}: ${c.count}`}
                className={`h-full rounded-full ${c.barColor}`}
                style={{ flexBasis: `${(c.count / total) * 100}%` }}
              />
            ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {counts.map((c) => (
          <div key={c.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`h-2 w-2 rounded-full ${c.dotColor}`} />
            {c.label} ({c.count})
          </div>
        ))}
      </div>
    </div>
  );
}

export default StatusBarChart;
