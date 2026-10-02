import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { api, ApiError, qs, type ApiCall } from '../../services/api';
import { ApiResponsePanel } from '../../components/ApiResponsePanel';
import { EmptyState, ErrorState, PageHeader, Pagination, SortHeader, StatCard, StatusBadge, TableSkeleton, Tabs } from '../../components/ui';
import { date, dateTime, money } from '../../utils/format';

function useDebounced(value: string, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function AdminDashboardPage() {
  const { data, loading, error, reload } = useApi('/api/admin/stats');
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const s = data?.data;
  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Bank operations overview" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={loading ? '…' : s.customers} hint={loading ? '' : `${s.activeCustomers} active`} testId="stat-customers" />
        <StatCard label="Accounts" value={loading ? '…' : s.accounts} testId="stat-accounts" />
        <StatCard label="Pending Loans" value={loading ? '…' : s.pendingLoans} testId="stat-pending-loans" />
        <StatCard label="Open Tickets" value={loading ? '…' : s.openTickets} testId="stat-open-tickets" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          ['/admin/customers', 'Manage Customers', 'Search, filter, enable and disable customers'],
          ['/admin/transactions', 'Review Transactions', `${loading ? '…' : s.transactions} transactions across all accounts`],
          ['/admin/loans', 'Loan Approvals', 'Approve or reject applications'],
          ['/admin/tickets', 'Support Queue', 'Update ticket status'],
        ].map(([to, title, desc]) => (
          <Link key={to} to={to} className="card block p-5 transition hover:border-brand-500 hover:shadow">
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AdminCustomersPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [status, setStatus] = useState('');
  const [segment, setSegment] = useState('');
  const [sortBy, setSortBy] = useState('fullName');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [call, setCall] = useState<ApiCall | null>(null);
  useEffect(() => setPage(1), [q, status, segment, pageSize]);
  const { data, loading, error, reload } = useApi(`/api/admin/customers${qs({ search: q, status, segment, sortBy, order, page, pageSize })}`);
  const onSort = (f: string) => {
    setOrder(sortBy === f && order === 'asc' ? 'desc' : 'asc');
    setSortBy(f);
  };
  const toggle = async (c: any) => {
    const next = c.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (!window.confirm(`${next === 'DISABLED' ? 'Disable' : 'Enable'} customer ${c.fullName} (${c.customerId})?`)) return;
    try {
      const res = await api.patch(`/api/admin/customers/${c.customerId}/status`, { status: next });
      setCall(res.call);
      toast('success', res.data.message);
      reload();
    } catch (e) {
      toast('error', 'Update failed', (e as ApiError).message);
    }
  };
  return (
    <div>
      <PageHeader title="Customers" subtitle="View, search, filter, enable and disable customers" />
      <div className="card overflow-hidden">
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cust-search">
              Search Customers
            </label>
            <input id="cust-search" type="search" className="input" placeholder="Name, email, ID, username or city" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="cust-status">
              Status
            </label>
            <select id="cust-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cust-segment">
              Segment
            </label>
            <select id="cust-segment" className="input" value={segment} onChange={(e) => setSegment(e.target.value)}>
              <option value="">All</option>
              <option>Retail</option>
              <option>Premier</option>
              <option>Private</option>
            </select>
          </div>
        </div>
        {loading && !data ? (
          <TableSkeleton rows={5} cols={7} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data.data.length ? (
          <EmptyState title="No customers found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200" data-testid="customers-table" aria-label="Customers">
                <thead>
                  <tr>
                    <SortHeader label="Customer" field="fullName" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Customer ID" field="customerId" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="City" field="city" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Segment" field="segment" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Accounts" field="accountCount" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Total Balance" field="totalBalance" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Status" field="status" sortBy={sortBy} order={order} onSort={onSort} />
                    <th scope="col" className="th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((c: any) => (
                    <tr key={c.customerId} data-testid="customer-row">
                      <td className="td">
                        <span className="block font-semibold text-slate-900">{c.fullName}</span>
                        <span className="text-xs text-slate-500">
                          {c.email} · @{c.username}
                        </span>
                      </td>
                      <td className="td font-mono text-xs">{c.customerId}</td>
                      <td className="td">{c.city}</td>
                      <td className="td">{c.segment}</td>
                      <td className="td">{c.accountCount}</td>
                      <td className="td tabular">{money(c.totalBalance)}</td>
                      <td className="td">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="td">
                        <button className={c.status === 'ACTIVE' ? 'btn-sm btn-ghost text-red-600' : 'btn-sm btn-ghost text-emerald-700'} onClick={() => toggle(c)}>
                          {c.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 pt-3">
              <label htmlFor="cust-page-size" className="text-sm text-slate-600">
                Rows per page
              </label>
              <select id="cust-page-size" className="input w-20" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {[5, 10, 20].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <Pagination {...data.pagination} onPage={setPage} />
          </>
        )}
      </div>
      {call && (
        <div className="mt-6">
          <ApiResponsePanel call={call} />
        </div>
      )}
    </div>
  );
}

export function AdminTransactionsPage() {
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q, status, type]);
  const { data, loading, error, reload } = useApi(`/api/admin/transactions${qs({ search: q, status, type, sortBy, order, page, pageSize: 15 })}`);
  const onSort = (f: string) => {
    setOrder(sortBy === f && order === 'asc' ? 'desc' : 'asc');
    setSortBy(f);
  };
  return (
    <div>
      <PageHeader title="All Transactions" subtitle={data ? `${data.pagination.total} transactions` : ''} />
      <div className="card overflow-hidden">
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="atx-search">Search</label>
            <input id="atx-search" type="search" className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Description or transaction ID" />
          </div>
          <div>
            <label className="label" htmlFor="atx-status">Status</label>
            <select id="atx-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {['Completed', 'Pending', 'Failed', 'Reversed'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="atx-type">Type</label>
            <select id="atx-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All</option>
              {['Deposit', 'Withdrawal', 'Transfer', 'Payment', 'Refund', 'Salary', 'Interest', 'Fee'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {loading && !data ? (
          <TableSkeleton rows={8} cols={7} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200" data-testid="admin-transaction-table">
                <thead>
                  <tr>
                    <SortHeader label="Transaction ID" field="transactionId" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Date" field="date" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Description" field="description" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Account" field="accountId" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Type" field="type" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Amount" field="amount" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Status" field="status" sortBy={sortBy} order={order} onSort={onSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((t: any) => (
                    <tr key={t.transactionId} data-testid="transaction-row">
                      <td className="td font-mono text-xs">{t.transactionId}</td>
                      <td className="td">{dateTime(t.date)}</td>
                      <td className="td max-w-xs truncate">{t.description}</td>
                      <td className="td font-mono text-xs">{t.accountId}</td>
                      <td className="td">{t.type}</td>
                      <td className="td tabular font-semibold">{(t.direction === 'CREDIT' ? '+' : '-') + money(t.amount)}</td>
                      <td className="td"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...data.pagination} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

export function AdminLoansPage() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [call, setCall] = useState<ApiCall | null>(null);
  const { data, loading, error, reload } = useApi(`/api/admin/loans${qs({ status, page })}`);
  const decide = async (loan: any, decision: 'APPROVE' | 'REJECT') => {
    let reason: string | null = '';
    if (decision === 'APPROVE') {
      if (!window.confirm(`Approve ${loan.loanType} ${loan.applicationId} for ${loan.customerName} (${money(loan.requestedAmount)})?`)) return;
    } else {
      reason = window.prompt(`Reason for rejecting ${loan.applicationId}`, 'Insufficient credit history');
      if (reason === null) return;
    }
    try {
      const res = await api.patch(`/api/admin/loans/${loan.applicationId}`, { decision, reason });
      setCall(res.call);
      toast('success', res.data.message, loan.applicationId);
      reload();
    } catch (e) {
      const err = e as ApiError;
      setCall(err.call);
      toast('error', 'Decision failed', err.message);
    }
  };
  return (
    <div>
      <PageHeader title="Loan Approvals" subtitle="Approve or reject loan applications" />
      <div className="card overflow-hidden">
        <div className="px-4 pt-3">
          <Tabs label="Loan status" value={status} onChange={(s) => { setStatus(s); setPage(1); }} tabs={[{ id: '', label: 'All' }, { id: 'UNDER_REVIEW', label: 'Under Review' }, { id: 'SUBMITTED', label: 'Submitted' }, { id: 'APPROVED', label: 'Approved' }, { id: 'REJECTED', label: 'Rejected' }]} />
        </div>
        {loading && !data ? (
          <TableSkeleton rows={5} cols={7} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data.data.length ? (
          <EmptyState title="No loans in this status" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200" data-testid="admin-loans-table">
                <thead>
                  <tr>
                    {['Application', 'Customer', 'Type', 'Amount', 'Income', 'Applied', 'Status', 'Actions'].map((h) => <th scope="col" key={h} className="th">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((l: any) => {
                    const pending = ['SUBMITTED', 'UNDER_REVIEW'].includes(l.status);
                    return (
                      <tr key={l.applicationId} data-testid="loan-row">
                        <td className="td font-mono text-xs">{l.applicationId}</td>
                        <td className="td font-medium">{l.customerName}</td>
                        <td className="td">{l.loanType}</td>
                        <td className="td tabular">{money(l.requestedAmount)}</td>
                        <td className="td tabular">{money(l.monthlyIncome)}/mo</td>
                        <td className="td">{date(l.createdAt)}</td>
                        <td className="td"><StatusBadge status={l.status} /></td>
                        <td className="td">
                          {pending ? (
                            <div className="flex gap-1">
                              <button className="btn-sm btn-ghost text-emerald-700" onClick={() => decide(l, 'APPROVE')}>Approve</button>
                              <button className="btn-sm btn-ghost text-red-600" onClick={() => decide(l, 'REJECT')}>Reject</button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">{l.decisionReason ?? 'Decided'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination {...data.pagination} onPage={setPage} />
          </>
        )}
      </div>
      {call && <div className="mt-6"><ApiResponsePanel call={call} /></div>}
    </div>
  );
}

export function AdminTicketsPage() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [status, priority, q]);
  const { data, loading, error, reload } = useApi(`/api/admin/tickets${qs({ status, priority, search: q, page })}`);
  const update = async (t: any, next: string) => {
    try {
      const res = await api.patch(`/api/admin/tickets/${t.ticketId}`, { status: next });
      toast('success', res.data.message);
      reload();
    } catch (e) {
      toast('error', 'Update failed', (e as ApiError).message);
    }
  };
  return (
    <div>
      <PageHeader title="Support Tickets" subtitle="View and update customer tickets" />
      <div className="card overflow-hidden">
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="atk-search">Search</label>
            <input id="atk-search" type="search" className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ticket, subject or customer" />
          </div>
          <div>
            <label className="label" htmlFor="atk-status">Status</label>
            <select id="atk-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="atk-priority">Priority</label>
            <select id="atk-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All</option>
              {['Low', 'Medium', 'High', 'Urgent'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {loading && !data ? (
          <TableSkeleton rows={5} cols={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data.data.length ? (
          <EmptyState title="No tickets" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200" data-testid="admin-tickets-table">
                <thead>
                  <tr>{['Ticket', 'Customer', 'Subject', 'Priority', 'Created', 'Status'].map((h) => <th scope="col" key={h} className="th">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((t: any) => (
                    <tr key={t.ticketId} data-testid="ticket-row">
                      <td className="td font-mono text-xs">{t.ticketId}</td>
                      <td className="td">{t.customerName}</td>
                      <td className="td max-w-xs truncate font-medium">{t.subject}</td>
                      <td className="td">{t.priority}</td>
                      <td className="td">{date(t.createdAt)}</td>
                      <td className="td">
                        <label className="sr-only" htmlFor={`status-${t.ticketId}`}>Status for {t.ticketId}</label>
                        <select id={`status-${t.ticketId}`} className="input w-36 py-1 text-xs" value={t.status} onChange={(e) => update(t, e.target.value)}>
                          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...data.pagination} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
