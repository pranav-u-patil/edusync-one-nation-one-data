import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data } = await client.get('/dashboard');
        setStats(data.stats);
      } catch (dashboardError) {
        setError(dashboardError.response?.data?.error || dashboardError.message);
      }
    };

    loadDashboard();
  }, []);

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

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ['/upload', 'Upload CSV', 'Import data once and preview the incoming columns.'],
          ['/map-fields', 'Field Mapping', 'Map CSV headers to dynamic system fields.'],
          ['/templates', 'Template Selection', 'Choose NAAC, NBA, or UGC as a base report.'],
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
