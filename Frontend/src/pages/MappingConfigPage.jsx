import { useEffect, useState } from 'react';
import client from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';

export const MappingConfigPage = () => {
  const { session, templates } = useWorkspace();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedSessionHeaders, setSelectedSessionHeaders] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [fields, setFields] = useState([]);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const loadFields = async () => {
      try {
        const [fieldsResponse] = await Promise.all([client.get('/fields')]);
        setFields(fieldsResponse.data.fields || []);
      } catch (loadError) {
        setError(loadError.response?.data?.error || loadError.message);
      }
    };

    const loadSessions = async () => {
      try {
        const { data } = await client.get('/sessions');
        setSessions(data.sessions || []);
      } catch (e) {
        // non-fatal
      }
    };

    loadFields();
    loadSessions();
  }, []);

  useEffect(() => {
    // When selected session changes, load its headers
    if (selectedSessionId) {
      const selectedSession = sessions.find((s) => s.id === selectedSessionId);
      if (selectedSession) {
        setSelectedSessionHeaders(selectedSession.headers || []);
      }
    } else {
      setSelectedSessionHeaders([]);
    }
  }, [selectedSessionId, sessions]);

  const loadMappings = async () => {
    const sessionIdToUse = selectedSessionId || session?.sessionId;
    if (!sessionIdToUse || !selectedTemplateId) {
      setError('Select an upload session and template first.');
      return;
    }

    try {
      // First try to get existing mappings
      const { data } = await client.get('/map-fields', { params: { sessionId: sessionIdToUse, templateId: selectedTemplateId } });
      
      // If no mappings exist, generate suggestions from the backend
      if (!data.mappings || data.mappings.length === 0) {
        const suggestResponse = await client.post('/map-fields', { 
          sessionId: sessionIdToUse, 
          templateId: selectedTemplateId, 
          mappings: [] // Empty array triggers suggestion generation
        });
        setMappings(suggestResponse.data.mappings || []);
      } else {
        setMappings(data.mappings);
      }
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
    const sessionIdToUse = selectedSessionId || session?.sessionId;
    if (!sessionIdToUse || !selectedTemplateId) {
      setError('Select an upload session and template first.');
      return;
    }

    await client.post('/save-mappings', { sessionId: sessionIdToUse, templateId: selectedTemplateId, mappings });
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
          <select value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3">
            <option value="">Select upload session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.filename} · {new Date(s.createdAt).toLocaleString()}</option>
            ))}
          </select>
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
          {mappings.length > 0 ? (
            // If mappings loaded, show them (handles both vertical and wide formats)
            mappings.map((mapping) => (
              <div key={mapping.csvField} className="grid gap-3 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div className="text-sm font-bold text-slate-950">{mapping.csvField}</div>
                <select
                  value={mapping.systemField || ''}
                  onChange={(event) => updateMapping(mapping.csvField, event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <option value="">Choose field</option>
                  {fields.map((field) => (
                    <option key={field._id || field.id} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </div>
            ))
          ) : (
            // Fallback: show headers if no mappings loaded yet (for manual mapping)
            (selectedSessionId ? selectedSessionHeaders : session?.headers || []).map((csvField) => (
              <div key={csvField} className="grid gap-3 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div className="text-sm font-bold text-slate-950">{csvField}</div>
                <select
                  value=""
                  onChange={(event) => updateMapping(csvField, event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <option value="">Choose field</option>
                  {fields.map((field) => (
                    <option key={field._id || field.id} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
