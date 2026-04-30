const statusStyles = {
  pending: 'bg-slate-100 text-slate-700 ring-slate-200',
  processing: 'bg-cyan-50 text-cyan-800 ring-cyan-200',
  extracting: 'bg-blue-50 text-blue-800 ring-blue-200',
  'calling-apis': 'bg-amber-50 text-amber-800 ring-amber-200',
  calculating: 'bg-teal-50 text-teal-800 ring-teal-200',
  completed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  failed: 'bg-rose-50 text-rose-800 ring-rose-200'
};

export default function StatusBadge({ status }) {
  const label = status || 'unknown';
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold ring-1 ${
        statusStyles[label] || 'bg-slate-100 text-slate-700 ring-slate-200'
      }`}
    >
      {label}
    </span>
  );
}
