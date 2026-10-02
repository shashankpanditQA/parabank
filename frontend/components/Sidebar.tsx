import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cx } from '../utils/format';

interface Item {
  to: string;
  label: string;
  icon?: string;
}
interface Section {
  title: string;
  items: Item[];
  roles?: Array<'CUSTOMER' | 'ADMIN'>;
}

export const NAV: Section[] = [
  { title: '', items: [{ to: '/dashboard', label: 'Dashboard', icon: '◧' }], roles: ['CUSTOMER'] },
  {
    title: 'Banking',
    roles: ['CUSTOMER'],
    items: [
      { to: '/accounts', label: 'Accounts', icon: '▤' },
      { to: '/transactions', label: 'Transactions', icon: '⇅' },
      { to: '/transfers', label: 'Transfers', icon: '⇄' },
      { to: '/payments', label: 'Payments', icon: '◉' },
      { to: '/loans', label: 'Loans', icon: '◈' },
      { to: '/cards', label: 'Cards', icon: '▭' },
      { to: '/beneficiaries', label: 'Beneficiaries', icon: '☰' },
    ],
  },
  {
    title: 'Support',
    roles: ['CUSTOMER'],
    items: [
      { to: '/notifications', label: 'Notifications', icon: '◔' },
      { to: '/support', label: 'Support Tickets', icon: '✉' },
    ],
  },
  {
    title: 'Administration',
    roles: ['ADMIN'],
    items: [
      { to: '/admin', label: 'Admin Dashboard', icon: '◧' },
      { to: '/admin/customers', label: 'Customers', icon: '☺' },
      { to: '/admin/transactions', label: 'All Transactions', icon: '⇅' },
      { to: '/admin/loans', label: 'Loan Approvals', icon: '◈' },
      { to: '/admin/tickets', label: 'Support Tickets', icon: '✉' },
    ],
  },
  {
    title: 'Automation Lab',
    items: [
      { to: '/lab', label: 'Lab Dashboard', icon: '⚗' },
      { to: '/lab/locators', label: 'Locators' },
      { to: '/lab/forms', label: 'Forms' },
      { to: '/lab/tables', label: 'Tables' },
      { to: '/lab/pagination', label: 'Pagination' },
      { to: '/lab/iframes', label: 'iFrames' },
      { to: '/lab/dialogs', label: 'Alerts & Dialogs' },
      { to: '/lab/popups', label: 'Popups & Windows' },
      { to: '/lab/tabs', label: 'Multiple Tabs' },
      { to: '/lab/api', label: 'API Responses' },
      { to: '/lab/network', label: 'Network Interception' },
      { to: '/lab/upload', label: 'File Upload' },
      { to: '/lab/download', label: 'File Download' },
      { to: '/lab/workflows', label: 'Advanced Workflows' },
    ],
  },
  {
    title: 'Challenges',
    items: [
      { to: '/challenges/beginner', label: 'Beginner' },
      { to: '/challenges/intermediate', label: 'Intermediate' },
      { to: '/challenges/advanced', label: 'Advanced' },
      { to: '/challenges/expert', label: 'Expert' },
    ],
  },
  { title: 'Reference', items: [{ to: '/api-docs', label: 'API Documentation', icon: '{}' }] },
];

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { user } = useAuth();
  return (
    <aside
      className={cx(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 text-slate-300 transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
      aria-label="Sidebar"
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-lg font-black text-navy-950">P</div>
        <div>
          <p className="text-[15px] font-bold leading-tight text-white">ParaBank Pro</p>
          <p className="text-[11px] leading-tight text-slate-400">Playwright Automation Lab</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {NAV.filter((s) => !s.roles || (user && s.roles.includes(user.role))).map((section) => (
          <div key={section.title || 'home'} className="mb-4">
            {section.title && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{section.title}</p>}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/lab' || item.to === '/admin'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition',
                        isActive ? 'bg-white/10 font-semibold text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    <span className="w-4 text-center text-xs text-slate-500" aria-hidden>
                      {item.icon ?? '•'}
                    </span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4 text-[11px] text-slate-500">Practice environment · No real money</div>
    </aside>
  );
}
