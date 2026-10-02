import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { NAV } from './Sidebar';

const EXTRA_CRUMBS: Record<string, string> = { admin: 'Admin', lab: 'Automation Lab', challenges: 'Challenges' };

export function Breadcrumb() {
  const { pathname } = useLocation();
  const labels = new Map<string, string>();
  NAV.forEach((s) => s.items.forEach((i) => labels.set(i.to, i.label)));
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = parts
    .map((p, i) => {
      const to = '/' + parts.slice(0, i + 1).join('/');
      return { to, part: p, label: labels.get(to) ?? EXTRA_CRUMBS[p] ?? decodeURIComponent(p) };
    })
    .filter((c) => !(c.part === 'c' && c.to === '/challenges/c'))
    .map((c) => (c.to === '/challenges' ? { ...c, to: '/challenges/beginner' } : c));
  return (
    <nav aria-label="Breadcrumb" className="hidden text-sm text-slate-500 md:block">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link to="/" className="hover:text-slate-800">
            Home
          </Link>
        </li>
        {crumbs.map((c, i) => (
          <li key={c.to} className="flex items-center gap-1.5">
            <span aria-hidden>/</span>
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="font-medium text-slate-800">
                {c.label}
              </span>
            ) : (
              <Link to={c.to} className="hover:text-slate-800">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState<number | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (user?.role !== 'CUSTOMER') return;
    api
      .get('/api/notifications?status=unread', { silentAuth: true })
      .then((r) => setUnread(r.data.unreadCount))
      .catch(() => setUnread(null));
  }, [user, pathname]);

  const doLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button className="btn-ghost btn-sm lg:hidden" onClick={onMenu} aria-label="Open navigation menu">
        ☰
      </button>
      <Breadcrumb />
      <div className="ml-auto flex items-center gap-2">
        {user?.role === 'CUSTOMER' && (
          <Link to="/notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
            <span aria-hidden>🔔</span>
            {!!unread && (
              <span data-testid="notification-badge" className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
        )}
        <div className="relative">
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen} data-testid="user-menu">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">
              {user?.fullName
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight text-slate-800" data-testid="header-username">
                {user?.fullName}
              </span>
              <span className="block text-xs leading-tight text-slate-500">{user?.role === 'ADMIN' ? 'Administrator' : user?.customerId}</span>
            </span>
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {user?.role === 'CUSTOMER' && (
                <Link role="menuitem" to="/accounts" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-50">
                  My Accounts
                </Link>
              )}
              <Link role="menuitem" to="/lab" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-50">
                Practice Settings
              </Link>
              <button role="menuitem" onClick={doLogout} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
