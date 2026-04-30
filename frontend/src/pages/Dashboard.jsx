import { useState } from 'react';
import { getRecentAssessments } from '../services/storage.js';

export default function Dashboard() {
  const [lookupId, setLookupId] = useState('');
  const recentAssessments = getRecentAssessments();

  function openLookup(event) {
    event.preventDefault();
    if (lookupId.trim()) {
      window.location.hash = `#/assessment/${lookupId.trim()}`;
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Private backend assessment queue overview.</p>
        </div>
        <a
          className="focus-ring inline-flex h-11 items-center justify-center border border-accent bg-accent px-4 text-sm font-semibold text-white"
          href="#/new"
        >
          New Assessment
        </a>
      </div>

      <form className="border border-line bg-white p-4" onSubmit={openLookup}>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Assessment ID
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="focus-ring h-11 flex-1 border border-line px-3 text-base text-ink"
              onChange={(event) => setLookupId(event.target.value)}
              placeholder="Paste assessment ID"
              value={lookupId}
            />
            <button className="focus-ring h-11 border border-ink bg-ink px-4 text-sm font-semibold text-white">
              Open
            </button>
          </div>
        </label>
      </form>

      <section className="border border-line bg-white">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-base font-bold text-ink">Recent Assessments</h2>
        </div>
        {recentAssessments.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No local assessment history yet.</div>
        ) : (
          <div className="divide-y divide-line">
            {recentAssessments.map((item) => (
              <a
                className="focus-ring grid gap-1 px-4 py-3 hover:bg-panel sm:grid-cols-[1.4fr_1fr_1fr]"
                href={`#/assessment/${item.assessmentId}`}
                key={item.assessmentId}
              >
                <span className="font-semibold text-ink">{item.companyName}</span>
                <span className="text-sm text-slate-600">{item.caseId}</span>
                <span className="break-all text-sm text-slate-500">{item.assessmentId}</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
