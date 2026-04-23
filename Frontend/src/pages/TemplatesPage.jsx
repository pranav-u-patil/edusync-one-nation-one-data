import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';

export const TemplatesPage = () => {
  const navigate = useNavigate();
  const { selectedTemplate, setSelectedTemplate } = useWorkspace();
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const { data } = await client.get('/templates');
        setTemplates(data.templates || []);
      } catch (loadError) {
        setError(loadError.response?.data?.error || loadError.message);
      }
    };

    loadTemplates();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">Templates</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Select a report template</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Templates are stored in MongoDB and rendered through EJS.</p>
      </section>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template)}
            className={`rounded-[1.75rem] border p-6 text-left shadow-soft transition hover:-translate-y-1 ${selectedTemplate?.id === template.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white'}`}
          >
            <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white">
              {template.key}
            </div>
            <h2 className="mt-4 text-2xl font-black text-slate-950">{template.name}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{template.description}</p>
            <div className="mt-5 text-sm font-semibold text-slate-500">{template.fields?.length || 0} metadata fields</div>
          </button>
        ))}
      </section>

      <div className="flex gap-3">
        <button onClick={() => navigate('/map-fields')} className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white">Continue to mapping</button>
        <button onClick={() => navigate('/autofill')} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700">Skip to autofill</button>
      </div>
    </div>
  );
};
