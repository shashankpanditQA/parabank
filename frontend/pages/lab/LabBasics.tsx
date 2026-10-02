import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api, ApiError, type ApiCall } from '../../services/api';
import { ApiResponsePanel } from '../../components/ApiResponsePanel';
import { Alert, EmptyState, ErrorState, Field, PageHeader, Pagination, StatusBadge, TableSkeleton } from '../../components/ui';
import { cx, money } from '../../utils/format';

export function LabIntro({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">{children}</div>;
}

// ------------------------------------------------------------------ Locators
const BILLERS = [
  { name: 'Electricity', due: 128.4, status: 'Due' },
  { name: 'Water', due: 42.1, status: 'Paid' },
  { name: 'Internet', due: 79.99, status: 'Due' },
  { name: 'Mobile', due: 55.0, status: 'Overdue' },
];

export function LocatorsLabPage() {
  const [clicked, setClicked] = useState<string | null>(null);
  const [showDelayed, setShowDelayed] = useState(false);
  const [dynamicId] = useState(() => `btn-${Math.random().toString(36).slice(2, 8)}`);
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShowDelayed(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <PageHeader title="Locators Playground" subtitle="Practice getByRole, getByText, getByLabel, getByPlaceholder, getByTestId, filter(), has, nth()" />
      <LabIntro>Prefer user-facing locators. Several elements below share the same text on purpose — scope your locator with <span className="code">filter()</span> or a parent.</LabIntro>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="billers-h">
          <h2 id="billers-h" className="mb-3 font-semibold">
            Biller Cards (duplicate buttons)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {BILLERS.map((b) => (
              <article key={b.name} className="rounded-lg border border-slate-200 p-4" data-testid="biller-card" aria-label={`${b.name} biller`}>
                <h3 className="font-semibold">{b.name}</h3>
                <p className="tabular text-sm text-slate-600">Amount due: {money(b.due)}</p>
                <StatusBadge status={b.status === 'Paid' ? 'Completed' : b.status === 'Due' ? 'Pending' : 'Failed'} />
                <span className="sr-only">{b.status}</span>
                <button className="btn-primary btn-sm mt-3 w-full" disabled={b.status === 'Paid'} onClick={() => setClicked(`Pay clicked for ${b.name}`)}>
                  Pay
                </button>
              </article>
            ))}
          </div>
          {clicked && (
            <p className="mt-3 text-sm font-medium text-brand-700" role="status" data-testid="locator-result">
              {clicked}
            </p>
          )}
        </section>

        <section className="card space-y-4 p-5" aria-labelledby="misc-h">
          <h2 id="misc-h" className="font-semibold">
            Mixed Elements
          </h2>
          <Field label="Customer Reference" htmlFor="loc-ref">
            <input id="loc-ref" className="input" placeholder="Enter customer reference" />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-secondary" title="Refresh account balances" onClick={() => setCounter((c) => c + 1)}>
              ⟳
            </button>
            <span className="text-sm text-slate-600">
              Refreshed <strong data-testid="refresh-count">{counter}</strong> times
            </span>
            <button id={dynamicId} className="btn-secondary" onClick={() => setClicked('Dynamic ID button clicked')}>
              Dynamic ID Button
            </button>
            <button className="btn-secondary" disabled>
              Disabled Action
            </button>
          </div>
          <img alt="ParaBank Pro security shield" width={56} height={56} src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%230d9488' d='M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z'/></svg>" />
          <p className="text-sm">
            Exact vs partial text: <span>Savings</span> · <span>Savings Account</span> · <span>High-Yield Savings Account</span>
          </p>
          <ul aria-label="Recent payees" className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {['Alice Johnson', 'Robert Smith', 'Maria Gonzalez', 'Kevin Lee', 'Fatima Khan'].map((n, i) => (
              <li key={n} className="flex justify-between px-3 py-2">
                {n}
                <span className="text-slate-500">#{i + 1}</span>
              </li>
            ))}
          </ul>
          <div aria-live="polite">
            {showDelayed ? (
              <Alert kind="success" testId="delayed-message">
                Account verification complete
              </Alert>
            ) : (
              <p className="text-sm text-slate-500">Verifying account… (appears after 2 seconds)</p>
            )}
          </div>
          <div hidden data-testid="hidden-element">
            You should not be able to see this
          </div>
        </section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Forms
export function FormsLabPage() {
  const initial = { fullName: '', email: '', phone: '', country: '', dob: '', contact: 'email', interests: [] as string[], income: '50000', notes: '', paperless: false, terms: false };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [call, setCall] = useState<ApiCall | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const set = (k: keyof typeof initial, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleInterest = (i: string) => set('interests', form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (form.phone && !/^\+?[\d\s-]{7,15}$/.test(form.phone)) errs.phone = 'Enter a valid phone number';
    if (!form.country) errs.country = 'Select a country';
    if (!form.dob) errs.dob = 'Date of birth is required';
    if (!form.terms) errs.terms = 'You must accept the terms';
    setErrors(errs);
    setSubmitted(false);
    if (Object.keys(errs).length) return;
    try {
      const res = await api.post('/api/lab/echo', { form: 'kyc-profile', ...form });
      setCall(res.call);
      setSubmitted(true);
    } catch (err) {
      setCall((err as ApiError).call);
    }
  };

  return (
    <div>
      <PageHeader title="Forms Lab" subtitle="Inputs, dropdowns, checkboxes, radio buttons, date pickers, sliders and toggles" />
      <LabIntro>
        Submitting posts the form to <span className="code">POST /api/lab/echo</span>, which returns exactly what it received — perfect for asserting request payloads.
      </LabIntro>
      <form className="card grid gap-5 p-6 md:grid-cols-2" onSubmit={submit} noValidate aria-label="KYC profile form">
        <Field label="Full Name" htmlFor="kyc-name" error={errors.fullName} required>
          <input id="kyc-name" className="input" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} aria-invalid={!!errors.fullName} />
        </Field>
        <Field label="Email Address" htmlFor="kyc-email" error={errors.email} required>
          <input id="kyc-email" type="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Phone" htmlFor="kyc-phone" error={errors.phone}>
          <input id="kyc-phone" type="tel" className="input" placeholder="+1 555 123 4567" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Country" htmlFor="kyc-country" error={errors.country} required>
          <select id="kyc-country" className="input" value={form.country} onChange={(e) => set('country', e.target.value)}>
            <option value="">Select country</option>
            <option value="US">United States</option>
            <option value="IN">India</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="DE">Germany</option>
          </select>
        </Field>
        <Field label="Date of Birth" htmlFor="kyc-dob" error={errors.dob} required>
          <input id="kyc-dob" type="date" className="input" max="2008-12-31" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
        </Field>
        <fieldset>
          <legend className="label">Preferred Contact Method</legend>
          <div className="flex flex-wrap gap-4 pt-1">
            {[
              ['email', 'Email'],
              ['sms', 'SMS'],
              ['phone', 'Phone Call'],
            ].map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="contact" value={v} checked={form.contact === v} onChange={() => set('contact', v)} className="accent-brand-600" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Products of Interest</legend>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {['Credit Card', 'Home Loan', 'Investments', 'Insurance'].map((i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.interests.includes(i)} onChange={() => toggleInterest(i)} className="h-4 w-4 accent-brand-600" />
                {i}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={`Annual Income: ${money(Number(form.income))}`} htmlFor="kyc-income">
          <input id="kyc-income" type="range" min={0} max={300000} step={5000} value={form.income} onChange={(e) => set('income', e.target.value)} className="w-full accent-brand-600" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Notes" htmlFor="kyc-notes">
            <textarea id="kyc-notes" rows={3} className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" role="switch" aria-checked={form.paperless} aria-label="Paperless statements" onClick={() => set('paperless', !form.paperless)} className={cx('relative h-6 w-11 rounded-full transition', form.paperless ? 'bg-brand-600' : 'bg-slate-300')}>
            <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', form.paperless ? 'left-5' : 'left-0.5')} />
          </button>
          <span className="text-sm">Paperless statements</span>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.terms} onChange={(e) => set('terms', e.target.checked)} className="h-4 w-4 accent-brand-600" />I agree to the KYC terms
          </label>
          {errors.terms && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{errors.terms}</p>}
        </div>
        <div className="flex gap-2 md:col-span-2">
          <button type="submit" className="btn-primary">
            Submit Profile
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setForm(initial);
              setErrors({});
              setSubmitted(false);
            }}
          >
            Reset
          </button>
        </div>
        {submitted && (
          <div className="md:col-span-2">
            <Alert kind="success" testId="form-success">
              Profile submitted for {form.fullName}
            </Alert>
          </div>
        )}
      </form>
      {call && (
        <div className="mt-6">
          <ApiResponsePanel call={call} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Tables
const BRANCHES = [
  { code: 'NYC-001', city: 'New York', manager: 'Laura Chen', staff: 42, rating: 4.6, open: true },
  { code: 'CHI-014', city: 'Chicago', manager: 'Marcus Reed', staff: 28, rating: 4.2, open: true },
  { code: 'SEA-007', city: 'Seattle', manager: 'Priya Natarajan', staff: 19, rating: 4.8, open: false },
  { code: 'HOU-021', city: 'Houston', manager: 'Diego Alvarez', staff: 33, rating: 3.9, open: true },
  { code: 'BOS-003', city: 'Boston', manager: 'Grace Park', staff: 24, rating: 4.4, open: true },
  { code: 'MIA-011', city: 'Miami', manager: 'Omar Haddad', staff: 15, rating: 4.1, open: false },
];

export function TablesLabPage() {
  const { data, loading, error, reload } = useApi('/api/lab/directory');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: keyof (typeof BRANCHES)[number]; dir: 1 | -1 }>({ key: 'code', dir: 1 });
  const branches = useMemo(() => [...BRANCHES].sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : -1) * sort.dir), [sort]);
  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <PageHeader title="Tables Lab" subtitle="Nested tables (Customer → Account → Transactions) and a sortable static table" />
      <LabIntro>
        Never hard-code row numbers. Find rows by content: <span className="code">{"page.getByRole('row').filter({ hasText: 'Sarah Mitchell' })"}</span>
      </LabIntro>
      <section className="card mb-6 overflow-hidden" aria-label="Customer directory">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Customer Directory</h2>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" onClick={() => setExpanded(new Set(data?.data.map((c: any) => c.customerId)))}>
              Expand All
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setExpanded(new Set())}>
              Collapse All
            </button>
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <table className="min-w-full" data-testid="customer-directory" aria-label="Customers">
            <thead>
              <tr>
                <th scope="col" className="th w-10" />
                <th scope="col" className="th">Customer</th>
                <th scope="col" className="th">Customer ID</th>
                <th scope="col" className="th">City</th>
                <th scope="col" className="th">Accounts</th>
              </tr>
            </thead>
            {data.data.map((c: any) => (
              <tbody key={c.customerId} className="border-t border-slate-200" data-testid="customer-group" data-customer-id={c.customerId}>
                <tr className="hover:bg-slate-50">
                  <td className="td">
                    <button className="btn-ghost btn-sm" aria-expanded={expanded.has(c.customerId)} aria-label={`Toggle accounts for ${c.name}`} onClick={() => toggle(c.customerId)}>
                      {expanded.has(c.customerId) ? '▾' : '▸'}
                    </button>
                  </td>
                  <td className="td font-semibold">{c.name}</td>
                  <td className="td font-mono text-xs">{c.customerId}</td>
                  <td className="td">{c.city}</td>
                  <td className="td">{c.accounts.length}</td>
                </tr>
                {expanded.has(c.customerId) && (
                  <tr>
                    <td colSpan={5} className="bg-slate-50 px-6 py-3">
                      <table className="min-w-full rounded-lg border border-slate-200 bg-white" data-testid="account-table" aria-label={`Accounts of ${c.name}`}>
                        <thead>
                          <tr>
                            <th scope="col" className="th">Account</th>
                            <th scope="col" className="th">Type</th>
                            <th scope="col" className="th">Balance</th>
                            <th scope="col" className="th">Latest Transactions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {c.accounts.map((a: any) => (
                            <tr key={a.accountNumber} data-testid="account-row">
                              <td className="td font-mono text-xs">{a.accountNumber}</td>
                              <td className="td">{a.type}</td>
                              <td className="td tabular font-semibold" data-testid="account-balance">
                                {money(a.balance)}
                              </td>
                              <td className="td">
                                <table className="w-full text-xs" aria-label={`Transactions for ${a.accountNumber}`} data-testid="nested-transactions">
                                  <tbody>
                                    {a.transactions.map((t: any) => (
                                      <tr key={t.transactionId}>
                                        <td className="py-0.5 pr-3 font-mono">{t.transactionId}</td>
                                        <td className="max-w-[12rem] truncate py-0.5 pr-3">{t.description}</td>
                                        <td className={cx('tabular py-0.5 text-right', t.amount < 0 ? 'text-slate-700' : 'text-emerald-600')}>{money(t.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </tbody>
            ))}
          </table>
        )}
      </section>

      <section className="card overflow-hidden" aria-label="Branches">
        <h2 className="border-b border-slate-200 px-5 py-4 font-semibold">Branch Network (client-side sorting)</h2>
        <table className="min-w-full divide-y divide-slate-200" data-testid="branch-table" aria-label="Branch network">
          <thead>
            <tr>
              {(['code', 'city', 'manager', 'staff', 'rating', 'open'] as const).map((k) => (
                <th scope="col" key={k} className="th" aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button className="uppercase" onClick={() => setSort({ key: k, dir: sort.key === k ? ((sort.dir * -1) as 1 | -1) : 1 })}>
                    {k === 'open' ? 'Status' : k} {sort.key === k ? (sort.dir === 1 ? '▲' : '▼') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {branches.map((b) => (
              <tr key={b.code}>
                <td className="td font-mono text-xs">{b.code}</td>
                <td className="td">{b.city}</td>
                <td className="td">{b.manager}</td>
                <td className="td tabular">{b.staff}</td>
                <td className="td tabular">{b.rating}</td>
                <td className="td">
                  <StatusBadge status={b.open ? 'Active' : 'Closed'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Pagination
export function PaginationLabPage() {
  const [page, setPage] = useState(1);
  const [jump, setJump] = useState('');
  const { data, loading, error, reload } = useApi(`/api/transactions?page=${page}&pageSize=8&sortBy=transactionId&order=asc`);
  const [items, setItems] = useState<any[]>([]);
  const [morePage, setMorePage] = useState(1);
  const [moreTotal, setMoreTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMore = async (p: number) => {
    setLoadingMore(true);
    try {
      const { data } = await api.get(`/api/notifications`);
      const pageItems = data.data.slice((p - 1) * 4, p * 4);
      setMoreTotal(data.data.length);
      setItems((prev) => (p === 1 ? pageItems : [...prev, ...pageItems]));
      setMorePage(p);
    } finally {
      setLoadingMore(false);
    }
  };
  useEffect(() => {
    loadMore(1);
  }, []);

  return (
    <div>
      <PageHeader title="Pagination Lab" subtitle="Numbered pagination with page jump, and a “Load more” list" />
      <LabIntro>Iterate pages until a record is found, or jump directly to a page. Transactions here are sorted by ID so the order is stable.</LabIntro>
      <section className="card mb-6 overflow-hidden" aria-label="Paginated transactions">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4">
          <p className="text-sm text-slate-600">
            Current page: <strong data-testid="current-page">{data?.pagination.page ?? page}</strong> of <strong data-testid="total-pages">{data?.pagination.totalPages ?? '…'}</strong>
          </p>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(jump);
              if (n >= 1 && data && n <= data.pagination.totalPages) setPage(n);
            }}
          >
            <Field label="Go to page" htmlFor="jump-page">
              <input id="jump-page" type="number" min={1} className="input w-24" value={jump} onChange={(e) => setJump(e.target.value)} />
            </Field>
            <button className="btn-secondary">Go</button>
          </form>
        </div>
        {loading && !data ? (
          <TableSkeleton rows={8} cols={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <>
            <table className="min-w-full divide-y divide-slate-200" data-testid="paged-table">
              <thead>
                <tr>
                  {['Transaction ID', 'Description', 'Amount', 'Status'].map((h) => (
                    <th scope="col" key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((t: any) => (
                  <tr key={t.transactionId} data-testid="transaction-row">
                    <td className="td font-mono text-xs">{t.transactionId}</td>
                    <td className="td">{t.description}</td>
                    <td className="td tabular">{money(t.amount)}</td>
                    <td className="td">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...data.pagination} onPage={setPage} />
          </>
        )}
      </section>
      <section className="card p-5" aria-label="Notifications feed">
        <h2 className="mb-3 font-semibold">Notifications Feed (Load more)</h2>
        {!items.length && !loadingMore ? (
          <EmptyState title="No notifications" />
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="feed-list">
            {items.map((n) => (
              <li key={n.id} className="py-2 text-sm" data-testid="feed-item">
                <span className="font-medium">{n.title}</span> <span className="text-slate-500">· {n.type}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center gap-3">
          <button className="btn-secondary" disabled={loadingMore || items.length >= moreTotal} onClick={() => loadMore(morePage + 1)}>
            {loadingMore ? 'Loading…' : items.length >= moreTotal ? 'No more items' : 'Load more'}
          </button>
          <span className="text-sm text-slate-500" data-testid="feed-count">
            Showing {items.length} of {moreTotal}
          </span>
        </div>
      </section>
    </div>
  );
}
