import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const academicYearOptions = ['2022-23', '2023-24', '2024-25', '2025-26'];

export const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data } = await client.get('/dashboard', { params: { academicYear } });
        setStats(data.stats);
      } catch (dashboardError) {
        setError(dashboardError.response?.data?.error || dashboardError.message);
      }
    };

    loadDashboard();
  }, [academicYear]);

  const cards = [
    { title: 'Templates', value: stats?.templateCount ?? '—', tone: 'cyan' },
    { title: 'Fields', value: stats?.fieldCount ?? '—', tone: 'emerald' },
    { title: 'Reports', value: stats?.reportCount ?? '—', tone: 'amber' },
    { title: 'Upload Sessions', value: stats?.sessionCount ?? '—', tone: 'violet' },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-slate-950 px-8 py-10 text-white shadow-soft">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-cyan-200">
            {user?.role === 'admin' ? 'Admin workspace' : 'User workspace'}
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight lg:text-5xl">Welcome, {user?.name}.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Manage CSV ingestion, template selection, field mapping, and report generation from one place.
          </p>
          <div className="mt-6 max-w-xs rounded-2xl bg-white/10 p-4">
            <label className="text-sm font-semibold text-white/80">
              Academic year
              <select
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
              >
                {academicYearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>
          {error ? <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">{card.title}</div>
            <div className="mt-5 text-4xl font-black text-slate-950">{card.value}</div>
          </div>
        ))}
      </section>

      {stats?.yearSummary ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Database summary</div>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Year summary for {academicYear}</h2>
            </div>
            <div className="rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-800">Pulled from YearSummary</div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ['NAAC', stats.yearSummary.naac],
              ['UGC', stats.yearSummary.ugc],
              ['NBA', stats.yearSummary.nba],
            ].map(([title, item]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-950">{title}</div>
                <div className="mt-2 text-sm text-slate-600">Total reports: {item?.totalReports ?? 0}</div>
                <div className="text-sm text-slate-600">Completed: {item?.completedReports ?? 0}</div>
                <div className="text-sm text-slate-600">Completion: {item?.completionPercentage ?? 0}%</div>
                <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">Status: {item?.reportStatus || 'draft'}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ['/upload', 'Upload CSV', 'Import data once and preview the incoming columns.'],
          ['/map-fields', 'Field Mapping', 'Map CSV headers to dynamic system fields.'],
          ['/templates', 'Template Selection', 'Choose NAAC, NBA, or UGC as a base report.'],
          ['/analytics/comparison', 'Year Comparison', 'Compare metrics and trends across academic years.'],
        ].map(([to, title, description]) => (
          <Link key={title} to={to} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
            <div className="text-lg font-bold text-slate-950">{title}</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            <div className="mt-5 text-sm font-bold text-cyan-700">Open workspace →</div>
          </Link>
        ))}
      </section>
    </div>
  );
};
