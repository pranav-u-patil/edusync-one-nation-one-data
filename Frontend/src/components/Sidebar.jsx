import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const userLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Upload CSV' },
  { to: '/map-fields', label: 'Mapping' },
  { to: '/templates', label: 'Templates' },
  { to: '/autofill', label: 'Autofill' },
  { to: '/report-output', label: 'Report Output' },
  { to: '/reports', label: 'My Reports' },
  { to: '/analytics/comparison', label: 'Year Comparison' },
];

const adminLinks = [
  { to: '/admin-dashboard', label: 'Admin Dashboard' },
  { to: '/admin/templates', label: 'Template Management' },
  { to: '/admin/fields', label: 'Field Builder' },
  { to: '/admin/mappings', label: 'Mapping Configuration' },
  { to: '/admin/suggestions', label: 'Metadata Suggestions' },
  ...userLinks,
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const links = user?.role === 'admin' ? adminLinks : userLinks;

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-200/80 bg-slate-950 px-5 py-6 text-white shadow-soft">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">EduSync</div>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight">Universal Data & Template Management</h1>
        <p className="mt-2 text-sm text-slate-300">Role-based reporting across NAAC, NBA, and UGC.</p>
      </div>

      <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Logged in as</div>
        <div className="mt-2 text-lg font-semibold">{user?.name}</div>
        <div className="text-sm text-slate-300">{user?.email}</div>
        <div className="mt-3 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
          {user?.role}
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              [
                'block rounded-2xl px-4 py-3 text-sm font-semibold transition',
                isActive ? 'bg-cyan-400 text-slate-950' : 'text-slate-200 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={logout}
        className="mt-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/10"
      >
        Sign out
      </button>
    </aside>
  );
};
