import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';

export const MappingPage = () => {
  const navigate = useNavigate();
  const { session, templates, setTemplates, fields, setFields, selectedTemplate, setSelectedTemplate, mappings, setMappings } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [extraFieldsLoading, setExtraFieldsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [unmappedExtraFields, setUnmappedExtraFields] = useState([]);
  const [ignoredFields, setIgnoredFields] = useState([]);
  const [extraFieldSelections, setExtraFieldSelections] = useState({});
  const autoSuggestedWorkspaceRef = useRef(null);
  const csvHeaders = session?.headers || [];
  const templateFields = selectedTemplate?.fields || [];
  
  // Detect vertical format the same way backend does
  const isVerticalUpload = useMemo(() => {
    if (csvHeaders.length !== 2) return false;
    const normalized = csvHeaders.map(h => String(h).trim().toLowerCase());
    return (
      (normalized.some(h => h.includes('field')) && normalized.some(h => h.includes('value'))) ||
      (normalized.some(h => h.includes('question')) && normalized.some(h => h.includes('answer')))
    );
  }, [csvHeaders]);
  
  const verticalFieldHeader = csvHeaders[0] || 'Field Name';
  const verticalValueHeader = csvHeaders[1] || 'Value';
  const mappingSourceFields = useMemo(() => {
    if (!isVerticalUpload) {
      return csvHeaders;
    }

    return (session?.rows || [])
      .map((row) => String(row[verticalFieldHeader] ?? '').trim())
      .filter(Boolean);
  }, [csvHeaders, isVerticalUpload, session?.rows, verticalFieldHeader]);

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

  // Load existing mappings when template changes
  useEffect(() => {
    const loadExistingMappings = async () => {
      if (!session?.sessionId || !selectedTemplate?.id) {
        setMappings([]);
        autoSuggestedWorkspaceRef.current = null;
        return;
      }

      try {
        const { data } = await client.get('/map-fields', {
          params: {
            sessionId: session.sessionId,
            templateId: selectedTemplate.id,
          },
        });
        const existingMappings = data.mappings || [];
        setMappings(existingMappings);
      } catch (error) {
        // No existing mappings; will need to auto-suggest
        setMappings([]);
      }
    };

    loadExistingMappings();
  }, [csvHeaders.length, mappingSourceFields.length, selectedTemplate?.id, session?.sessionId, setMappings]);

  useEffect(() => {
    const autoLoadMappings = async () => {
      if (!session?.sessionId || !selectedTemplate?.id || csvHeaders.length === 0) {
        return;
      }

      if (mappings.length > 0) {
        return;
      }

      const workspaceKey = `${session.sessionId}:${selectedTemplate.id}`;
      if (autoSuggestedWorkspaceRef.current === workspaceKey) {
        return;
      }

      autoSuggestedWorkspaceRef.current = workspaceKey;
      setLoading(true);
      setError('');

      try {
        const { data } = await client.post('/map-fields', {
          sessionId: session.sessionId,
          templateId: selectedTemplate.id,
        });
        setMappings(data.mappings || []);
      } catch (mappingError) {
        setError(mappingError.response?.data?.error || mappingError.message);
      } finally {
        setLoading(false);
      }
    };

    autoLoadMappings();
  }, [csvHeaders.length, mappingSourceFields.length, mappings.length, selectedTemplate?.id, session?.sessionId, setMappings]);

  useEffect(() => {
    const loadUnmappedExtraFields = async () => {
      if (!session?.sessionId || !selectedTemplate?.id) {
        setUnmappedExtraFields([]);
        setIgnoredFields([]);
        return;
      }

      setExtraFieldsLoading(true);
      try {
        const { data } = await client.get('/unmapped-extra-fields', {
          params: {
            sessionId: session.sessionId,
            templateId: selectedTemplate.id,
          },
        });
        setUnmappedExtraFields(data.unmappedFields || []);
        setIgnoredFields(data.ignoredFields || []);
      } catch (extraFieldError) {
        setError(extraFieldError.response?.data?.error || extraFieldError.message);
      } finally {
        setExtraFieldsLoading(false);
      }
    };

    loadUnmappedExtraFields();
  }, [selectedTemplate?.id, session?.sessionId]);

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

  const updateExtraFieldSelection = (csvField, systemField) => {
    setExtraFieldSelections((previous) => ({
      ...previous,
      [csvField]: systemField,
    }));
  };

  const refreshExtraFields = async () => {
    if (!session?.sessionId || !selectedTemplate?.id) {
      return;
    }

    const { data } = await client.get('/unmapped-extra-fields', {
      params: {
        sessionId: session.sessionId,
        templateId: selectedTemplate.id,
      },
    });
    setUnmappedExtraFields(data.unmappedFields || []);
    setIgnoredFields(data.ignoredFields || []);
  };

  const recordExtraFieldAction = async (csvField, action) => {
    if (!session || !selectedTemplate) {
      setError('Upload a CSV and select a template first.');
      return;
    }

    if (action === 'map_now') {
      const systemField = extraFieldSelections[csvField];
      if (!systemField) {
        setError('Choose a system field before mapping this extra column.');
        return;
      }
      updateMapping(csvField, systemField);
    }

    try {
      await client.post('/extra-field-action', {
        sessionId: session.sessionId,
        templateId: selectedTemplate.id,
        csvField,
        action,
      });
      setMessage(action === 'suggested' ? 'Suggestion sent to admin.' : action === 'ignored' ? 'Field ignored for this year.' : 'Field added to the mapping list. Save mappings to persist it.');
      await refreshExtraFields();
    } catch (actionError) {
      setError(actionError.response?.data?.error || actionError.message);
    }
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
            <div className="mt-1 text-sm text-slate-600">Academic year: {session?.academicYear || 'Not selected'}</div>
            <div className="mt-4 text-sm font-bold text-slate-950">Headers</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {isVerticalUpload ? (
                <>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-800">{verticalFieldHeader}</span>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-800">{verticalValueHeader}</span>
                </>
              ) : csvHeaders.map((header) => (
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
            {mappingSourceFields.map((csvField, index) => {
              const existing = mappings.find((mapping) => mapping.csvField === csvField);
              const rowValue = isVerticalUpload ? session?.rows?.[index]?.[verticalValueHeader] : null;
              return (
                <div key={csvField} className="grid gap-3 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
                  <div>
                    <div className="text-sm font-bold text-slate-950">{csvField}</div>
                    {isVerticalUpload ? (
                      <>
                        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{verticalFieldHeader}</div>
                        <div className="mt-1 text-sm text-slate-600">{String(rowValue ?? '—')}</div>
                      </>
                    ) : (
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">CSV header</div>
                    )}
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

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Unmapped extra fields</div>
                <h3 className="mt-1 text-xl font-black text-slate-950">Keep or classify columns that do not match yet</h3>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {extraFieldsLoading ? 'Loading...' : `${unmappedExtraFields.length} pending`}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {unmappedExtraFields.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  No extra fields are waiting right now.
                </div>
              ) : unmappedExtraFields.map((field) => (
                <div key={field.csvField} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-950">{field.csvField}</div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Suggested key: {field.suggestedKey}</div>
                    </div>
                    <div className="flex flex-col gap-3 lg:min-w-[380px] lg:flex-row lg:items-center">
                      <select
                        value={extraFieldSelections[field.csvField] || ''}
                        onChange={(event) => updateExtraFieldSelection(field.csvField, event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <option value="">Choose system field</option>
                        {fieldChoices.map((choice) => (
                          <option key={choice.value} value={choice.value}>{choice.label}</option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => recordExtraFieldAction(field.csvField, 'ignored')}
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                        >
                          Ignore
                        </button>
                        <button
                          onClick={() => recordExtraFieldAction(field.csvField, 'map_now')}
                          className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950"
                        >
                          Map now
                        </button>
                        <button
                          onClick={() => recordExtraFieldAction(field.csvField, 'suggested')}
                          className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800"
                        >
                          Suggest
                        </button>
                      </div>
                    </div>
                  </div>
                  {ignoredFields.includes(field.csvField) ? (
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Ignored for this session</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
