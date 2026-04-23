import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminDashboardPage = () => {
  const { user } = useAuth();

  const cards = [
    { to: '/admin/templates', title: 'Template management', description: 'Create, edit, and delete template metadata.' },
    { to: '/admin/fields', title: 'Field builder', description: 'Add or remove metadata-driven fields.' },
    { to: '/admin/mappings', title: 'Mapping configuration', description: 'Review and refine CSV-to-field mappings.' },
    { to: '/reports', title: 'Report archive', description: 'See generated outputs across sessions.' },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-slate-950 px-8 py-10 text-white shadow-soft">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Admin dashboard</div>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Welcome, {user?.name}.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
          Manage the metadata layer that powers all EduSync reports without touching backend code.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-1">
            <div className="text-lg font-black text-slate-950">{card.title}</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
};
