import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';

const academicYearOptions = ['2022-23', '2023-24', '2024-25', '2025-26'];
const HIDE_COMPARISON_PAGE = true;

export const YearComparisonPage = () => {
  if (HIDE_COMPARISON_PAGE) {
    return null;
  }

  const navigate = useNavigate();
  const { templates } = useWorkspace();
  const [year1, setYear1] = useState('2023-24');
  const [year2, setYear2] = useState('2024-25');
  const [templateId, setTemplateId] = useState('');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchComparison = async () => {
    if (year1 === year2) {
      setError('Please select two different years for comparison.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await client.get('/year-comparison', {
        params: { year1, year2, templateId: templateId || undefined }
      });
      setComparison(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch comparison data');
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [year1, year2, templateId]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">Analytics</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Year-over-Year Comparison</h1>
        <p className="mt-2 text-slate-600">Analyze performance deltas and trends between academic years.</p>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Base Year</label>
            <select value={year1} onChange={(e) => setYear1(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5">
              {academicYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Comparison Year</label>
            <select value={year2} onChange={(e) => setYear2(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5">
              {academicYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Template (Optional)</label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5">
              <option value="">All Templates</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl bg-rose-500/10 px-6 py-4 text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Calculating deltas...</div>
      ) : comparison ? (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-900 p-6 text-white">
              <div className="text-xs uppercase tracking-widest text-slate-400">Comparison Mode</div>
              <div className="mt-2 text-2xl font-black">{year1} vs {year2}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-xs uppercase tracking-widest text-slate-500">Total Metrics</div>
              <div className="mt-2 text-2xl font-black text-slate-950">{Object.keys(comparison.comparison).length}</div>
            </div>
          </div>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="mb-6 text-xl font-bold text-slate-950">Metric Performance</h2>
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-bold">Metric Field</th>
                    <th className="px-6 py-4 font-bold">{year1}</th>
                    <th className="px-6 py-4 font-bold">{year2}</th>
                    <th className="px-6 py-4 font-bold">Delta</th>
                    <th className="px-6 py-4 font-bold text-right">Change (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(comparison.comparison).map(([key, data]) => (
                    <tr key={key} className="transition hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-slate-900 capitalize">{key.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-slate-600">{data.year1}</td>
                      <td className="px-6 py-4 text-slate-600">{data.year2}</td>
                      <td className={`px-6 py-4 font-bold ${data.delta > 0 ? 'text-emerald-600' : data.delta < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {data.delta > 0 ? '+' : ''}{data.delta}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`rounded-full px-2 py-1 text-xs font-black ${
                          data.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                          data.trend === 'down' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {data.percentChange}% {data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 shadow-soft">
          Select years and a template to see comparison data.
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => navigate('/dashboard')} className="rounded-2xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
          Dashboard
        </button>
      </div>
    </div>
  );
};
