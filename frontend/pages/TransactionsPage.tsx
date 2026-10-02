import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { qs } from '../services/api';
import { EmptyState, ErrorState, PageHeader, Pagination, SortHeader, StatusBadge, TableSkeleton } from '../components/ui';
import { dateTime, money } from '../utils/format';

const TYPES = ['Deposit', 'Withdrawal', 'Transfer', 'Payment', 'Refund', 'Salary', 'Interest', 'Fee'];
const STATUSES = ['Completed', 'Pending', 'Failed', 'Reversed'];
const FILTER_KEYS = ['search', 'status', 'type', 'accountId', 'fromDate', 'toDate', 'minAmount', 'maxAmount'] as const;

export function TransactionsPage() {
  const [params, setParams] = useSearchParams();
  const get = (k: string, d = '') => params.get(k) ?? d;
  const [searchText, setSearchText] = useState(get('search'));
  const page = Number(get('page', '1'));
  const pageSize = Number(get('pageSize', '10'));
  const sortBy = get('sortBy', 'date');
  const order = (get('order', sortBy === 'date' ? 'desc' : 'asc') as 'asc' | 'desc');

  const update = (patch: Record<string, string | number | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage && !('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchText !== get('search')) update({ search: searchText });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const query = useMemo(() => {
    const q: Record<string, string> = { page: String(page), pageSize: String(pageSize), sortBy, order };
    FILTER_KEYS.forEach((k) => params.get(k) && (q[k] = params.get(k)!));
    return qs(q);
  }, [params, page, pageSize, sortBy, order]);

  const { data, loading, error, reload } = useApi(`/api/transactions${query}`);
  const accounts = useApi('/api/accounts');
  const activeFilters = FILTER_KEYS.filter((k) => params.get(k)).length;

  const onSort = (field: string) => update({ sortBy: field, order: sortBy === field && order === 'asc' ? 'desc' : 'asc' });

  const reportUrl = `/api/downloads/transactions-report${qs(Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k)])))}`;

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle={data ? `${data.pagination.total} transactions match your filters` : 'Search, filter, sort and paginate your activity'}
        actions={
          <a className="btn-secondary" href={reportUrl} data-testid="download-report">
            Download Transaction Report
          </a>
        }
      />

      <section className="card mb-4 p-4" aria-label="Transaction filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="tx-search">
              Search
            </label>
            <input id="tx-search" type="search" className="input" placeholder="Search by description, ID or reference" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="tx-status">
              Status
            </label>
            <select id="tx-status" className="input" value={get('status')} onChange={(e) => update({ status: e.target.value })}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tx-type">
              Transaction Type
            </label>
            <select id="tx-type" className="input" value={get('type')} onChange={(e) => update({ type: e.target.value })}>
              <option value="">All types</option>
              {TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tx-account">
              Account
            </label>
            <select id="tx-account" className="input" value={get('accountId')} onChange={(e) => update({ accountId: e.target.value })}>
              <option value="">All accounts</option>
              {accounts.data?.data.map((a: any) => (
                <option key={a.accountNumber} value={a.accountNumber}>
                  {a.accountNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tx-from">
              From Date
            </label>
            <input id="tx-from" type="date" className="input" value={get('fromDate')} onChange={(e) => update({ fromDate: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="tx-to">
              To Date
            </label>
            <input id="tx-to" type="date" className="input" value={get('toDate')} onChange={(e) => update({ toDate: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="tx-min">
                Min Amount
              </label>
              <input id="tx-min" type="number" min="0" className="input" value={get('minAmount')} onChange={(e) => update({ minAmount: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="tx-max">
                Max Amount
              </label>
              <input id="tx-max" type="number" min="0" className="input" value={get('maxAmount')} onChange={(e) => update({ maxAmount: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {activeFilters ? (
              <>
                <strong data-testid="active-filter-count">{activeFilters}</strong> active filter{activeFilters > 1 ? 's' : ''}
              </>
            ) : (
              'No filters applied'
            )}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="tx-page-size" className="text-sm text-slate-600">
              Rows per page
            </label>
            <select id="tx-page-size" className="input w-20" value={pageSize} onChange={(e) => update({ pageSize: e.target.value })}>
              {[5, 10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <button
              className="btn-secondary btn-sm"
              disabled={!activeFilters}
              onClick={() => {
                setSearchText('');
                setParams(new URLSearchParams(), { replace: true });
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        {loading && !data ? (
          <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} cols={8} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.data.length === 0 ? (
          <EmptyState title="No transactions found" message="Try adjusting your search or filters." />
        ) : (
          <>
            <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
              <table className="min-w-full divide-y divide-slate-200" data-testid="transaction-table" aria-label="Transactions">
                <thead>
                  <tr>
                    <SortHeader label="Transaction ID" field="transactionId" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Date" field="date" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Description" field="description" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Type" field="type" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Amount" field="amount" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Account" field="accountId" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Status" field="status" sortBy={sortBy} order={order} onSort={onSort} />
                    <SortHeader label="Balance After" field="balanceAfter" sortBy={sortBy} order={order} onSort={onSort} />
                    <th scope="col" className="th">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((t: any) => (
                    <tr key={t.transactionId} data-testid="transaction-row" data-transaction-id={t.transactionId} className="hover:bg-slate-50">
                      <td className="td font-mono text-xs">{t.transactionId}</td>
                      <td className="td">{dateTime(t.date)}</td>
                      <td className="td max-w-xs truncate font-medium text-slate-800">{t.description}</td>
                      <td className="td">{t.type}</td>
                      <td className={`td tabular font-semibold ${t.direction === 'CREDIT' ? 'text-emerald-600' : 'text-slate-800'}`}>{(t.direction === 'CREDIT' ? '+' : '-') + money(t.amount)}</td>
                      <td className="td font-mono text-xs">{t.accountId}</td>
                      <td className="td">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="td tabular">{money(t.balanceAfter)}</td>
                      <td className="td text-right">
                        <button className="btn-ghost btn-sm" onClick={() => window.open(`/popups/transaction?id=${t.transactionId}`, `txn-${t.transactionId}`, 'width=720,height=640')}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} pageSize={data.pagination.pageSize} onPage={(p) => update({ page: p }, false)} />
          </>
        )}
      </section>
    </div>
  );
}
