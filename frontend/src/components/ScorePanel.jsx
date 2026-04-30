function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function ScorePanel({ results }) {
  if (!results) {
    return (
      <section className="border border-line bg-white p-4">
        <h2 className="text-base font-bold text-ink">Decision</h2>
        <p className="mt-3 text-sm text-slate-600">Awaiting calculation.</p>
      </section>
    );
  }

  const breakdown = results.scoreBreakdown || {};

  return (
    <section className="border border-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Decision</h2>
          <div className="mt-2 text-3xl font-bold text-ink">{results.decision}</div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-sm font-semibold text-slate-600">Score</div>
          <div className="text-3xl font-bold text-accent">{results.score}</div>
        </div>
      </div>
      <div className="mt-4 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">Recommended limit</span>
          <span className="font-semibold text-ink">{money(results.recommendedLimit)}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        {Object.entries(breakdown).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="capitalize text-slate-600">{key.replace(/([A-Z])/g, ' $1')}</span>
            <span className="font-semibold text-ink">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
