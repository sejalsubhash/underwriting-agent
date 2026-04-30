import { useEffect, useMemo, useState } from 'react';
import EditableFinancials from '../components/EditableFinancials.jsx';
import ProgressTimeline from '../components/ProgressTimeline.jsx';
import ScorePanel from '../components/ScorePanel.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import useAssessmentSocket from '../hooks/useAssessmentSocket.js';
import { getAssessment, recalculateAssessment, submitReview } from '../services/api.js';

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function AssessmentDetail({ assessmentId }) {
  const [assessment, setAssessment] = useState(null);
  const [financials, setFinancials] = useState({});
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const socket = useAssessmentSocket(assessmentId);

  async function loadAssessment() {
    setLoading(true);
    setError('');

    try {
      const data = await getAssessment(assessmentId);
      setAssessment(data);
      setFinancials({
        revenue: data.extracted?.financials?.revenue ?? '',
        profit: data.extracted?.financials?.profit ?? '',
        liabilities: data.extracted?.financials?.liabilities ?? ''
      });
      setDecision(data.results?.decision || '');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to load assessment');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssessment();
  }, [assessmentId]);

  useEffect(() => {
    if (socket.events.some((event) => event.event === 'completed')) {
      loadAssessment();
    }
  }, [socket.events]);

  const mergedStatus = useMemo(() => {
    const latestSocketEvent = socket.events[socket.events.length - 1];
    return latestSocketEvent?.event || assessment?.metadata?.status;
  }, [assessment, socket.events]);

  function updateFinancial(key, value) {
    setFinancials((current) => ({ ...current, [key]: value }));
  }

  async function applyFinancialChanges() {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const updatedFields = {
        revenue: Number(financials.revenue),
        profit: Number(financials.profit),
        liabilities: Number(financials.liabilities)
      };
      const data = await recalculateAssessment(assessmentId, updatedFields);
      setAssessment(data);
      setDecision(data.results?.decision || decision);
      setMessage('Score recalculated.');
    } catch (err) {
      setError(err.response?.data?.error || 'Recalculation API is not available yet.');
    } finally {
      setSaving(false);
    }
  }

  async function finalizeReview(finalDecision) {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        updatedFields: {
          revenue: Number(financials.revenue),
          profit: Number(financials.profit),
          liabilities: Number(financials.liabilities)
        },
        decision: finalDecision,
        notes,
        user: 'credit.manager@local'
      };
      const data = await submitReview(assessmentId, payload);
      setAssessment(data);
      setDecision(finalDecision);
      setMessage('Final decision submitted.');
    } catch (err) {
      setError(err.response?.data?.error || 'Review API is not available yet.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="border border-line bg-white p-4 text-sm text-slate-600">Loading assessment.</div>;
  }

  if (error && !assessment) {
    return <div className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;
  }

  const metadata = assessment?.metadata;
  const extracted = assessment?.extracted;
  const results = assessment?.results;
  const ratios = results?.ratios || {};

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-normal text-ink">{metadata?.companyName || assessmentId}</h1>
            <StatusBadge status={mergedStatus} />
          </div>
          <p className="mt-1 break-all text-sm text-slate-600">{assessmentId}</p>
        </div>
        <div className="text-sm text-slate-600 sm:text-right">
          <div>{socket.connected ? 'Socket connected' : 'Socket offline'}</div>
          <div>Case {metadata?.caseId || '-'}</div>
        </div>
      </div>

      <ProgressTimeline events={socket.events} progressOrder={socket.progressOrder} />

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <section className="border border-line bg-white p-4">
            <h2 className="text-base font-bold text-ink">Extracted Data</h2>
            {!extracted ? (
              <p className="mt-3 text-sm text-slate-600">Extraction output is not available yet.</p>
            ) : (
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-slate-500">PAN</div>
                  <div className="font-semibold text-ink">{extracted.borrower?.pan}</div>
                </div>
                <div>
                  <div className="text-slate-500">Industry</div>
                  <div className="font-semibold text-ink">{extracted.borrower?.industry}</div>
                </div>
                <div>
                  <div className="text-slate-500">Revenue</div>
                  <div className="font-semibold text-ink">{money(extracted.financials?.revenue)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Profit</div>
                  <div className="font-semibold text-ink">{money(extracted.financials?.profit)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Liabilities</div>
                  <div className="font-semibold text-ink">{money(extracted.financials?.liabilities)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Business Vintage</div>
                  <div className="font-semibold text-ink">{extracted.borrower?.businessVintageYears} years</div>
                </div>
              </div>
            )}
          </section>

          <EditableFinancials
            onApply={applyFinancialChanges}
            onChange={updateFinancial}
            saving={saving}
            values={financials}
          />

          <section className="border border-line bg-white p-4">
            <h2 className="text-base font-bold text-ink">Ratios</h2>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <div className="text-slate-500">Profit Margin</div>
                <div className="font-semibold text-ink">{ratios.profitMargin ?? '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">Current Ratio</div>
                <div className="font-semibold text-ink">{ratios.currentRatio ?? '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">Debt to Net Worth</div>
                <div className="font-semibold text-ink">{ratios.debtToNetWorth ?? '-'}</div>
              </div>
            </div>
          </section>

          <section className="border border-line bg-white p-4">
            <h2 className="text-base font-bold text-ink">Review Notes</h2>
            <textarea
              className="focus-ring mt-3 min-h-28 w-full border border-line p-3 text-sm text-ink"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <ScorePanel results={results} />

          <section className="border border-line bg-white p-4">
            <h2 className="text-base font-bold text-ink">Final Decision</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {['Approve', 'Refer', 'Decline'].map((option) => (
                <button
                  className={`focus-ring h-10 border px-2 text-sm font-semibold ${
                    decision === option
                      ? 'border-accent bg-accent text-white'
                      : 'border-line bg-white text-ink hover:bg-panel'
                  }`}
                  key={option}
                  onClick={() => {
                    setDecision(option);
                    finalizeReview(option);
                  }}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {(message || error) && (
        <div
          className={`border p-3 text-sm ${
            error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {error || message}
        </div>
      )}
    </div>
  );
}
