import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui';

export function AppLayout() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid h-full place-items-center text-slate-500" role="status">
        <span className="flex items-center gap-2">
          <Spinner /> Loading ParaBank Pro...
        </span>
      </div>
    );
  }
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;

  return (
    <div className="min-h-full">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <div className="lg:pl-64">
        <Header onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Role-based access: renders the Unauthorized page when the role does not match. */
export function RequireRole({ role, children }: { role: 'CUSTOMER' | 'ADMIN'; children: React.ReactNode }) {
  const { user } = useAuth();
  if (user && user.role !== role) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-xl font-black text-navy-950">P</div>
          <span className="text-xl font-bold">ParaBank Pro</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-tight">A realistic bank, built for Playwright practice.</h2>
          <p className="mt-4 text-slate-300">Real iframes, real dialogs, real popups and a real REST API — with 105 challenges from beginner to expert.</p>
          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm text-slate-300">
            {['Locators & forms', 'Tables & pagination', 'iFrames & nested OTP', 'Alerts, confirm, prompt', 'Popups & tabs', 'API & network mocking'].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-brand-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">Practice environment. All data is fictional.</p>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-500/10" aria-hidden />
        <div className="absolute -right-10 top-24 h-48 w-48 rounded-full bg-brand-500/10" aria-hidden />
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">{children}</div>
    </div>
  );
}
