import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';

export const AutofillPage = () => {
  const navigate = useNavigate();
  const { session, selectedTemplate, mappings, setGeneratedReport } = useWorkspace();
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rowIndex, setRowIndex] = useState(0);
  const [format, setFormat] = useState('html');

  const row = session?.rows?.[rowIndex] || session?.rows?.[0] || {};

  useEffect(() => {
    if (!selectedTemplate || !session) {
      return;
    }

    const nextValues = {};
    for (const field of selectedTemplate.fields || []) {
      const mapping = mappings.find((item) => item.systemField === field.key);
      const csvField = mapping?.csvField;
      nextValues[field.key] = row[csvField] ?? row[field.key] ?? row[field.label] ?? '';
    }
    setFieldValues(nextValues);
  }, [selectedTemplate, session, mappings, rowIndex]);

  const resolvedFields = useMemo(() => selectedTemplate?.fields || [], [selectedTemplate]);

  const updateFieldValue = (key, value) => {
    setFieldValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!session || !selectedTemplate) {
      setError('Upload a CSV and choose a template before generating a report.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await client.post('/generate-report', {
        sessionId: session.sessionId,
        templateId: selectedTemplate.id,
        rowIndex,
        format,
        overrides: fieldValues,
        mappings,
      });
      setGeneratedReport(data);
      navigate('/report-output');
    } catch (generateError) {
      setError(generateError.response?.data?.error || generateError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">Autofill</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Review mapped values</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Green fields are resolved, red fields need manual input.</p>
      </section>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">Row</label>
          <input value={rowIndex} onChange={(event) => setRowIndex(Number(event.target.value))} type="number" min="0" className="w-24 rounded-2xl border border-slate-200 px-4 py-2" />
          <label className="text-sm font-semibold text-slate-700">Output</label>
          <select value={format} onChange={(event) => setFormat(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-2">
            <option value="html">HTML</option>
            <option value="pdf">PDF</option>
          </select>
        </div>

        <div className="mt-6 space-y-3">
          {resolvedFields.map((field) => {
            const value = fieldValues[field.key] || '';
            const filled = Boolean(value);
            return (
              <div key={field.key} className={`grid gap-3 rounded-2xl border p-4 lg:grid-cols-[1fr_1fr] ${filled ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                <div>
                  <div className="text-sm font-bold text-slate-950">{field.label}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{field.key}</div>
                </div>
                <input
                  value={value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="Enter or override value"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={() => navigate('/templates')} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700">Back</button>
          <button onClick={handleGenerate} disabled={loading} className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">
            {loading ? 'Generating...' : 'Generate report'}
          </button>
        </div>
      </section>
    </div>
  );
};
