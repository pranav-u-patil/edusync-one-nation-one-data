import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';

const academicYearOptions = ['2022-23', '2023-24', '2024-25', '2025-26'];

export const UploadCsvPage = () => {
  const navigate = useNavigate();
  const { setSession } = useWorkspace();
  const [file, setFile] = useState(null);
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [previewRows, setPreviewRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!file) {
      setError('Choose a CSV file first.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('academicYear', academicYear);
      const { data } = await client.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSession(data);
      setHeaders(data.headers || []);
      setPreviewRows(data.rows || []);
      setMessage('CSV parsed successfully. Proceed to mapping.');
    } catch (uploadError) {
      setError(uploadError.response?.data?.error || uploadError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">User flow</div>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Upload CSV</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Upload institutional master data once and reuse it across report templates.
            </p>
          </div>
          <button
            onClick={() => navigate('/map-fields')}
            className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Go to mapping
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.75rem] border border-dashed border-cyan-300 bg-cyan-50 p-6">
          <div className="rounded-[1.5rem] border border-cyan-200 bg-white p-5">
            <div className="text-lg font-bold text-slate-950">Drop or choose CSV</div>
            <p className="mt-2 text-sm text-slate-600">Accepted format: comma-separated values with headings in the first row.</p>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Academic year
              <select
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                {academicYearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            />
            <button
              onClick={handleUpload}
              disabled={loading}
              className="mt-4 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
            >
              {loading ? 'Parsing CSV...' : 'Upload and preview'}
            </button>
            {message ? <div className="mt-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}
            {error ? <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Preview</div>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Uploaded rows</h2>
            </div>
            <div className="flex gap-2">
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {headers.length} columns
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {previewRows.length} rows
              </div>
            </div>
          </div>

          {headers.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm text-slate-600">Upload a CSV file to see preview</p>
            </div>
          ) : (
            <div className="mt-5 max-h-[500px] overflow-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="min-w-[50px] border-r border-slate-200 px-4 py-3 font-semibold bg-slate-50">Row</th>
                    {headers.map((header) => (
                      <th key={header} className="min-w-[150px] border-r border-slate-200 px-4 py-3 font-semibold bg-slate-50 whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length + 1} className="px-4 py-6 text-center text-slate-500">
                        No rows to display
                      </td>
                    </tr>
                  ) : (
                    previewRows.map((row, index) => (
                      <tr key={index} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="border-r border-slate-200 px-4 py-3 text-slate-500 font-semibold bg-slate-50">{index + 1}</td>
                        {headers.map((header) => (
                          <td key={header} className="border-r border-slate-200 px-4 py-3 text-slate-700 break-words">{String(row[header] ?? '—')}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">Scroll horizontally to see all columns. Scroll vertically to browse all uploaded rows.</p>
        </div>
      </section>
    </div>
  );
};
