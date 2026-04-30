const fields = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'profit', label: 'Profit' },
  { key: 'liabilities', label: 'Liabilities' }
];

export default function EditableFinancials({ values, onChange, onApply, saving }) {
  return (
    <section className="border border-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-ink">Editable Financials</h2>
        <button
          className="focus-ring h-10 border border-accent bg-accent px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={onApply}
          type="button"
        >
          {saving ? 'Saving' : 'Apply Changes'}
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {fields.map((field) => (
          <label key={field.key} className="grid gap-1 text-sm font-semibold text-slate-700">
            {field.label}
            <input
              className="focus-ring h-11 border border-line bg-white px-3 text-base font-semibold text-ink"
              inputMode="numeric"
              min="0"
              onChange={(event) => onChange(field.key, event.target.value)}
              type="number"
              value={values[field.key] ?? ''}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
