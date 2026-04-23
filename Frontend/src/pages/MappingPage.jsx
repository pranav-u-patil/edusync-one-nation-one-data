import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';

export const MappingPage = () => {
  const navigate = useNavigate();
  const { session, templates, setTemplates, fields, setFields, selectedTemplate, setSelectedTemplate, mappings, setMappings } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [templatesResponse, fieldsResponse] = await Promise.all([
          client.get('/templates'),
          client.get('/fields'),
        ]);
        setTemplates(templatesResponse.data.templates || []);
        setFields(fieldsResponse.data.fields || []);
      } catch (catalogError) {
        setError(catalogError.response?.data?.error || catalogError.message);
      }
    };

    loadCatalog();
  }, [setFields, setTemplates]);

  useEffect(() => {
    if (!selectedTemplate && templates.length > 0) {
      setSelectedTemplate(templates[0]);
    }
  }, [selectedTemplate, setSelectedTemplate, templates]);

  const csvHeaders = session?.headers || [];
  const templateFields = selectedTemplate?.fields || [];

  const fieldChoices = useMemo(
    () => templateFields.map((field) => ({ value: field.key, label: field.label })),
    [templateFields]
  );

  const autoSuggest = async () => {
    if (!session || !selectedTemplate) {
      setError('Upload a CSV and select a template first.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data } = await client.post('/map-fields', {
        sessionId: session.sessionId,
        templateId: selectedTemplate.id,
      });
      setMappings(data.mappings || []);
      setMessage('Auto-mapping suggestions loaded. You can override each row before saving.');
    } catch (mappingError) {
      setError(mappingError.response?.data?.error || mappingError.message);
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (csvField, systemField) => {
    setMappings((previous) => {
      const next = previous.filter((item) => item.csvField !== csvField);
      next.push({ csvField, systemField, source: 'manual', confidence: 1 });
      return next;
    });
  };

  const saveMappings = async () => {
    if (!session || !selectedTemplate) {
      setError('Upload a CSV and select a template first.');
      return;
    }

    setLoading(true);
    try {
      await client.post('/save-mappings', {
        sessionId: session.sessionId,
        templateId: selectedTemplate.id,
        mappings,
      });
      setMessage('Mappings saved successfully.');
      navigate('/autofill');
    } catch (saveError) {
      setError(saveError.response?.data?.error || saveError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">Metadata mapping</div>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Map CSV headers to system fields</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Use machine suggestions, then override them before report generation.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/upload')} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700">Back</button>
            <button onClick={autoSuggest} disabled={loading} className="rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60">
              {loading ? 'Suggesting...' : 'Auto-suggest'}
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}

      <section className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Template</div>
          <select
            value={selectedTemplate?.id || ''}
            onChange={(event) => setSelectedTemplate(templates.find((template) => template.id === event.target.value) || null)}
            className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3"
          >
            <option value="">Select template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-bold text-slate-950">Session</div>
            <div className="mt-1 text-sm text-slate-600">{session?.filename || 'No CSV uploaded yet'}</div>
            <div className="mt-4 text-sm font-bold text-slate-950">Headers</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {csvHeaders.map((header) => (
                <span key={header} className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-800">{header}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Mapping table</div>
              <h2 className="mt-1 text-2xl font-black text-slate-950">CSV to system field mapping</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{mappings.length} mappings</div>
          </div>

          <div className="mt-5 space-y-3">
            {csvHeaders.map((csvField) => {
              const existing = mappings.find((mapping) => mapping.csvField === csvField);
              return (
                <div key={csvField} className="grid gap-3 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
                  <div>
                    <div className="text-sm font-bold text-slate-950">{csvField}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">CSV header</div>
                  </div>
                  <select
                    value={existing?.systemField || ''}
                    onChange={(event) => updateMapping(csvField, event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  >
                    <option value="">Choose system field</option>
                    {fieldChoices.map((field) => (
                      <option key={field.value} value={field.value}>{field.label}</option>
                    ))}
                  </select>
                  <div className="text-sm font-semibold text-slate-500">{existing?.source === 'suggested' ? 'Suggested' : 'Manual'}</div>
                </div>
              );
            })}
          </div>

          <button
            onClick={saveMappings}
            disabled={loading}
            className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save mapping and continue'}
          </button>
        </div>
      </section>
    </div>
  );
};
