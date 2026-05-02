import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export const MetadataSuggestionsPage = () => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/metadata-suggestions');
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (suggestionId, status) => {
    try {
      await client.post(`/metadata-suggestions/${suggestionId}/review`, {
        status,
        note: status === 'approved' ? 'Approved by admin' : 'Rejected by admin'
      });
      // Refresh list
      fetchSuggestions();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to review suggestion');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">Metadata Management</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Field Suggestions Review</h1>
        <p className="mt-2 text-slate-600">Review custom fields suggested by users during mapping sessions.</p>
      </section>

      {error && (
        <div className="rounded-2xl bg-rose-500/10 px-6 py-4 text-rose-700 font-semibold">
          {error}
        </div>
      )}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-950">Pending Review</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {suggestions.filter(s => s.status === 'pending').length} suggestions
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading suggestions...</div>
        ) : suggestions.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No pending suggestions found.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-bold">CSV Field</th>
                  <th className="px-6 py-4 font-bold">Suggested Mapping</th>
                  <th className="px-6 py-4 font-bold">Frequency</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suggestions.map((s) => (
                  <tr key={s._id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">{s.csvField}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-950">{s.suggestedLabel}</div>
                      <div className="text-xs text-slate-400 font-mono">{s.suggestedKey}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{s.submissionCount || 1}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                        s.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        s.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleReview(s._id, 'rejected')}
                            className="rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleReview(s._id, 'approved')}
                            className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      
      <div className="mt-6">
        <button onClick={() => navigate('/admin-dashboard')} className="rounded-2xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};
