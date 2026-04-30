const labels = {
  processing: 'Processing',
  extracting: 'Extracting',
  'calling-apis': 'Calling APIs',
  calculating: 'Calculating',
  completed: 'Completed'
};

export default function ProgressTimeline({ events, progressOrder }) {
  const completed = new Set(events.map((item) => item.event));

  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {progressOrder.map((event) => (
        <div
          key={event}
          className={`min-h-20 border px-3 py-3 ${
            completed.has(event)
              ? 'border-accent bg-white text-ink'
              : 'border-line bg-panel text-slate-500'
          }`}
        >
          <div className="text-sm font-semibold">{labels[event]}</div>
          <div className="mt-2 text-xs">
            {completed.has(event)
              ? new Date(events.find((item) => item.event === event).timestamp).toLocaleTimeString()
              : 'Waiting'}
          </div>
        </div>
      ))}
    </div>
  );
}
