import { useEffect, useState } from 'react';
import client from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';

export const MappingConfigPage = () => {
  const { session, templates } = useWorkspace();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [mappings, setMappings] = useState([]);
  const [fields, setFields] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFields = async () => {
      try {
        const [fieldsResponse] = await Promise.all([client.get('/fields')]);
        setFields(fieldsResponse.data.fields || []);
      } catch (loadError) {
        setError(loadError.response?.data?.error || loadError.message);
      }
    };

    loadFields();
  }, []);

  const loadMappings = async () => {
    if (!session || !selectedTemplateId) {
      setError('Use the user flow to upload a CSV and choose a template first.');
      return;
    }

    try {
      const { data } = await client.get('/map-fields', { params: { sessionId: session.sessionId, templateId: selectedTemplateId } });
      setMappings(data.mappings || []);
    } catch (loadError) {
      setError(loadError.response?.data?.error || loadError.message);
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
    if (!session || !selectedTemplateId) {
      setError('Use the user flow to upload a CSV and choose a template first.');
      return;
    }

    await client.post('/save-mappings', { sessionId: session.sessionId, templateId: selectedTemplateId, mappings });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Mapping configuration</h1>
        <p className="mt-2 text-slate-600">Review mappings for the current upload session and override suggestions where needed.</p>
      </section>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3">
            <option value="">Select template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <button onClick={loadMappings} className="rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950">Load mappings</button>
          <button onClick={saveMappings} className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">Save mappings</button>
        </div>

        <div className="mt-6 space-y-3">
          {(session?.headers || []).map((csvField) => {
            const existing = mappings.find((mapping) => mapping.csvField === csvField);
            return (
              <div key={csvField} className="grid gap-3 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div className="text-sm font-bold text-slate-950">{csvField}</div>
                <select
                  value={existing?.systemField || ''}
                  onChange={(event) => updateMapping(csvField, event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <option value="">Choose field</option>
                  {fields.map((field) => (
                    <option key={field._id || field.id} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
