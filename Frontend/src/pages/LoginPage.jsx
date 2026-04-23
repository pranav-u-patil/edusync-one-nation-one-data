import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@edusync.local');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin-dashboard' : '/dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError.response?.data?.error || loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
      <section className="flex items-center justify-center px-6 py-10 lg:px-12">
        <div className="max-w-2xl rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-soft backdrop-blur">
          <div className="inline-flex rounded-full bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-cyan-700">
            EduSync
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 lg:text-6xl">
            Role-based universal data and template management.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Upload CSV data once, map it to metadata-driven fields, and generate NAAC, NBA, and UGC reports without changing backend code.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Dynamic templates', 'Templates and fields come from MongoDB metadata.'],
              ['Role-based access', 'Users and admins get separate dashboards.'],
              ['PDF or HTML', 'Generate polished reports for presentations.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-950">{title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:px-12">
        <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-[2rem] bg-slate-950 p-8 text-white shadow-soft">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Login</div>
            <h2 className="mt-3 text-3xl font-black">Access your workspace</h2>
            <p className="mt-2 text-sm text-slate-300">Use the seeded credentials or your own account.</p>
          </div>

          {error ? <div className="mb-5 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-400 focus:border-cyan-400"
                placeholder="name@edusync.local"
                type="email"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-400 focus:border-cyan-400"
                placeholder="••••••••"
                type="password"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Login to EduSync'}
          </button>

          <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold text-white">Admin demo</div>
              <div className="mt-1">admin@edusync.local</div>
              <div>Admin@123</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold text-white">User demo</div>
              <div className="mt-1">user@edusync.local</div>
              <div>User@123</div>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};
