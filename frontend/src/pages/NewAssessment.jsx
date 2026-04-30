import { useMemo, useRef, useState } from 'react';
import { createAssessment } from '../services/api.js';
import { saveRecentAssessment } from '../services/storage.js';

const maxFileSize = 25 * 1024 * 1024;

const initialFields = {
  companyName: '',
  loanAmount: '',
  pan: '',
  caseId: '',
  callbackUrl: ''
};

function formatBytes(bytes) {
  if (!bytes) {
    return '0 KB';
  }

  const units = ['bytes', 'KB', 'MB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function normalizeFiles(fileList) {
  const incoming = Array.from(fileList || []);
  const accepted = [];
  const rejected = [];

  for (const file of incoming) {
    if (file.type !== 'application/pdf') {
      rejected.push(`${file.name}: only PDF files are accepted`);
      continue;
    }

    if (file.size > maxFileSize) {
      rejected.push(`${file.name}: file exceeds 25 MB`);
      continue;
    }

    accepted.push(file);
  }

  return { accepted, rejected };
}

export default function NewAssessment() {
  const inputRef = useRef(null);
  const [fields, setFields] = useState(initialFields);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [fileWarnings, setFileWarnings] = useState([]);

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files]
  );

  function updateField(key, value) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function addFiles(fileList) {
    const { accepted, rejected } = normalizeFiles(fileList);
    const existingKeys = new Set(files.map((file) => `${file.name}-${file.size}`));
    const nextFiles = [
      ...files,
      ...accepted.filter((file) => !existingKeys.has(`${file.name}-${file.size}`))
    ];

    setFiles(nextFiles);
    setFileWarnings(rejected);
  }

  function removeFile(fileToRemove) {
    setFiles((current) =>
      current.filter((file) => `${file.name}-${file.size}` !== `${fileToRemove.name}-${fileToRemove.size}`)
    );
  }

  function validateForm() {
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

    if (!panPattern.test(fields.pan)) {
      return 'PAN must use the format ABCDE1234F';
    }

    if (Number(fields.loanAmount) <= 0) {
      return 'Loan amount must be greater than zero';
    }

    if (fields.callbackUrl) {
      try {
        const parsed = new URL(fields.callbackUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return 'Callback URL must start with http or https';
        }
      } catch (_err) {
        return 'Callback URL is not valid';
      }
    }

    if (files.length === 0) {
      return 'Upload at least one PDF document';
    }

    return '';
  }

  async function submitAssessment(event) {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await createAssessment({
        fields: {
          ...fields,
          callbackUrl: fields.callbackUrl.trim()
        },
        files
      });
      saveRecentAssessment({
        assessmentId: response.assessmentId,
        companyName: fields.companyName,
        caseId: fields.caseId
      });
      window.location.hash = `#/assessment/${response.assessmentId}`;
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-ink">New Assessment</h1>
          <p className="mt-1 text-sm text-slate-600">Manual upload path for MSME underwriting.</p>
        </div>
        <div className="text-sm text-slate-600">
          {files.length} files, {formatBytes(totalSize)}
        </div>
      </div>

      <form className="grid gap-5" onSubmit={submitAssessment}>
        <section className="border border-line bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Company Name
              <input
                className="focus-ring h-11 border border-line px-3 text-base text-ink"
                onChange={(event) => updateField('companyName', event.target.value)}
                required
                value={fields.companyName}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Loan Amount
              <input
                className="focus-ring h-11 border border-line px-3 text-base text-ink"
                inputMode="numeric"
                min="1"
                onChange={(event) => updateField('loanAmount', event.target.value)}
                required
                type="number"
                value={fields.loanAmount}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              PAN
              <input
                className="focus-ring h-11 border border-line px-3 text-base uppercase text-ink"
                maxLength="10"
                onChange={(event) => updateField('pan', event.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                required
                value={fields.pan}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Case ID
              <input
                className="focus-ring h-11 border border-line px-3 text-base text-ink"
                onChange={(event) => updateField('caseId', event.target.value)}
                required
                value={fields.caseId}
              />
            </label>
          </div>

          <label className="mt-4 grid gap-1 text-sm font-semibold text-slate-700">
            Callback URL
            <input
              className="focus-ring h-11 border border-line px-3 text-base text-ink"
              onChange={(event) => updateField('callbackUrl', event.target.value)}
              placeholder="http://localhost:5001/callback"
              type="url"
              value={fields.callbackUrl}
            />
          </label>
        </section>

        <section className="border border-line bg-white p-4">
          <div
            className={`grid min-h-44 place-items-center border border-dashed p-5 text-center ${
              dragging ? 'border-accent bg-teal-50' : 'border-slate-300 bg-panel'
            }`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
            role="button"
            tabIndex="0"
          >
            <div>
              <div className="text-base font-bold text-ink">Upload PDF Documents</div>
              <div className="mt-2 text-sm text-slate-600">Drag files here or select from your machine.</div>
              <button
                className="focus-ring mt-4 h-10 border border-ink bg-white px-4 text-sm font-semibold text-ink"
                onClick={(event) => {
                  event.preventDefault();
                  inputRef.current?.click();
                }}
                type="button"
              >
                Select PDFs
              </button>
            </div>
            <input
              accept="application/pdf"
              className="hidden"
              multiple
              onChange={(event) => addFiles(event.target.files)}
              ref={inputRef}
              type="file"
            />
          </div>

          {fileWarnings.length > 0 && (
            <div className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {fileWarnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4 divide-y divide-line border border-line">
              {files.map((file) => (
                <div
                  className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[1fr_120px_90px]"
                  key={`${file.name}-${file.size}`}
                >
                  <span className="truncate font-semibold text-ink">{file.name}</span>
                  <span className="text-slate-600">{formatBytes(file.size)}</span>
                  <button
                    className="focus-ring justify-self-start border border-line bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-panel sm:justify-self-end"
                    onClick={() => removeFile(file)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border border-line bg-white p-4">
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-slate-500">Company</div>
              <div className="truncate font-semibold text-ink">{fields.companyName || '-'}</div>
            </div>
            <div>
              <div className="text-slate-500">Case ID</div>
              <div className="truncate font-semibold text-ink">{fields.caseId || '-'}</div>
            </div>
            <div>
              <div className="text-slate-500">PAN</div>
              <div className="font-semibold text-ink">{fields.pan || '-'}</div>
            </div>
            <div>
              <div className="text-slate-500">Documents</div>
              <div className="font-semibold text-ink">{files.length}</div>
            </div>
          </div>
        </section>

        {error && <div className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <a
            className="focus-ring inline-flex h-11 items-center justify-center border border-line bg-white px-5 text-sm font-semibold text-slate-700"
            href="#/"
          >
            Cancel
          </a>
          <button
            className="focus-ring h-11 border border-accent bg-accent px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Uploading' : 'Submit Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
}
