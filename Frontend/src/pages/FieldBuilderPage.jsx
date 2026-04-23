import { useEffect, useState } from 'react';
import client from '../api/client';

export const FieldBuilderPage = () => {
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({ label: '', key: '', type: 'text', description: '' });
  const [error, setError] = useState('');

  const loadFields = async () => {
    try {
      const { data } = await client.get('/fields');
      setFields(data.fields || []);
    } catch (loadError) {
      setError(loadError.response?.data?.error || loadError.message);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const submitField = async () => {
    try {
      await client.post('/fields', form);
      setForm({ label: '', key: '', type: 'text', description: '' });
      loadFields();
    } catch (submitError) {
      setError(submitError.response?.data?.error || submitError.message);
    }
  };

  const removeField = async (id) => {
    await client.delete(`/fields/${id}`);
    loadFields();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Field builder</h1>
      </section>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-black text-slate-950">Create field</h2>
          <div className="mt-4 space-y-3">
            <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Field label" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            <input value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="field_key" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            <input value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder="text" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Optional description" className="h-28 w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </div>
          <button onClick={submitField} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">Save field</button>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="text-xl font-black text-slate-950">Existing fields</div>
          <div className="mt-5 grid gap-3">
            {fields.map((field) => (
              <div key={field._id || field.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-base font-bold text-slate-950">{field.label}</div>
                    <div className="text-sm text-slate-600">{field.key} · {field.type}</div>
                  </div>
                  <button onClick={() => removeField(field._id || field.id)} className="rounded-full border border-rose-200 px-3 py-1 text-sm font-semibold text-rose-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
