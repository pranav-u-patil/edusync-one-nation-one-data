import { useEffect, useState } from 'react';
import client from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';

export const TemplateManagementPage = () => {
  const { fields } = useWorkspace();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ name: '', key: '', description: '', allowedRoles: ['user', 'admin'], fieldIds: [] });
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');

  const loadTemplates = async () => {
    try {
      const { data } = await client.get('/templates');
      setTemplates(data.templates || []);
    } catch (loadError) {
      setError(loadError.response?.data?.error || loadError.message);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const toggleField = (fieldId) => {
    setForm((previous) => {
      const nextFieldIds = previous.fieldIds.includes(fieldId)
        ? previous.fieldIds.filter((item) => item !== fieldId)
        : [...previous.fieldIds, fieldId];
      return { ...previous, fieldIds: nextFieldIds };
    });
  };

  const submitTemplate = async () => {
    try {
      if (editingId) {
        await client.put(`/templates/${editingId}`, form);
      } else {
        await client.post('/templates', form);
      }
      setForm({ name: '', key: '', description: '', allowedRoles: ['user', 'admin'], fieldIds: [] });
      setEditingId('');
      loadTemplates();
    } catch (submitError) {
      setError(submitError.response?.data?.error || submitError.message);
    }
  };

  const startEdit = (template) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      key: template.key,
      description: template.description,
      allowedRoles: template.allowedRoles || ['user', 'admin'],
      fieldIds: (template.fields || []).map((field) => field.id),
    });
  };

  const removeTemplate = async (id) => {
    await client.delete(`/templates/${id}`);
    loadTemplates();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">Admin</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Template management</h1>
      </section>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-black text-slate-950">{editingId ? 'Edit template' : 'Create template'}</h2>
          <div className="mt-4 space-y-3">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Template name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            <input value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="template-key" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Template description" className="h-28 w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </div>
          <div className="mt-5 text-sm font-bold text-slate-950">Attach fields</div>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
            {fields.map((field) => (
              <label key={field._id || field.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50">
                <input type="checkbox" checked={form.fieldIds.includes(field._id || field.id)} onChange={() => toggleField(field._id || field.id)} />
                <span className="text-sm font-semibold text-slate-700">{field.label}</span>
              </label>
            ))}
          </div>
          <button onClick={submitTemplate} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">
            {editingId ? 'Update template' : 'Create template'}
          </button>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="text-xl font-black text-slate-950">Existing templates</div>
          <div className="mt-5 space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold text-slate-950">{template.name}</div>
                    <div className="text-sm text-slate-600">{template.description}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">{template.fields?.length || 0} fields</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(template)} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold">Edit</button>
                    <button onClick={() => removeTemplate(template.id)} className="rounded-full border border-rose-200 px-3 py-1 text-sm font-semibold text-rose-600">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
