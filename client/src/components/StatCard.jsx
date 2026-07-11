const COLORS = {
  slate: 'text-slate-900',
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
};

function StatCard({ label, value, color = 'slate' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-semibold ${COLORS[color]}`}>{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default StatCard;
