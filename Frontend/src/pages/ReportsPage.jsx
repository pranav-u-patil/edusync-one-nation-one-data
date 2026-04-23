import { useEffect, useState } from 'react';
import client from '../api/client';

export const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadReports = async () => {
      try {
        const { data } = await client.get('/reports');
        setReports(data.reports || []);
      } catch (reportsError) {
        setError(reportsError.response?.data?.error || reportsError.message);
      }
    };

    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">Reports</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">My generated reports</h1>
      </section>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {reports.map((report) => (
          <article key={report._id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{report.format}</div>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{report.templateName}</h2>
              </div>
              <a href={report.pdfPath ? `/reports/${report.pdfPath.split('\\').pop()}` : `/reports/${report.htmlPath.split('\\').pop()}`} target="_blank" rel="noreferrer" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                Open
              </a>
            </div>
            <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-700">{JSON.stringify(report.data, null, 2)}</pre>
          </article>
        ))}
      </section>
    </div>
  );
};
