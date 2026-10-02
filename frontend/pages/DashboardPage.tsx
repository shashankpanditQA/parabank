import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { api, ApiError, type ApiCall } from '../services/api';
import { ApiResponsePanel } from '../components/ApiResponsePanel';
import { EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton, StatCard, StatusBadge, Spinner } from '../components/ui';
import { ACCOUNT_LABEL, date, dateTime, money } from '../utils/format';

export function DashboardPage() {
  const { data, loading, error, reload } = useApi('/api/dashboard');
  const navigate = useNavigate();
  const [cashModal, setCashModal] = useState<null | 'Deposit' | 'Withdraw'>(null);
  const [lastCall, setLastCall] = useState<ApiCall | null>(null);

  if (error) return <ErrorState error={error} onRetry={reload} />;

  const actions: Array<[string, () => void]> = [
    ['Transfer Money', () => navigate('/transfers')],
    ['Pay Bill', () => navigate('/payments')],
    ['Deposit', () => setCashModal('Deposit')],
    ['Withdraw', () => setCashModal('Withdraw')],
    ['Apply Loan', () => navigate('/loans')],
    ['Manage Cards', () => navigate('/cards')],
    ['View Transactions', () => navigate('/transactions')],
  ];

  return (
    <div>
      <PageHeader
        title={loading ? 'Dashboard' : `Welcome back, ${data.customer.firstName}`}
        subtitle={
          loading ? (
            <Skeleton className="h-4 w-48" />
          ) : (
            <>
              <span data-testid="customer-name">{data.customer.fullName}</span> · Customer ID <span className="code" data-testid="customer-id">{data.customer.customerId}</span> · {data.customer.segment} banking
            </>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Balance" value={money(data.balances.total)} hint="Checking + savings − credit owed" testId="total-balance" accent="bg-navy-900" />
            <StatCard label="Checking Balance" value={money(data.balances.checking)} testId="checking-balance" accent="bg-brand-500" />
            <StatCard label="Savings Balance" value={money(data.balances.savings)} testId="savings-balance" accent="bg-sky-500" />
            <StatCard label="Credit Balance" value={money(data.balances.credit)} hint="Outstanding on credit accounts" testId="credit-balance" accent="bg-amber-500" />
          </>
        )}
      </div>

      <section className="card mt-6 p-5" aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {actions.map(([label, fn]) => (
            <button key={label} className="btn-secondary" onClick={fn}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {lastCall && (
        <div className="mt-6">
          <ApiResponsePanel call={lastCall} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card overflow-hidden xl:col-span-2" aria-labelledby="recent-tx">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 id="recent-tx" className="font-semibold text-slate-900">
              Recent Transactions
            </h2>
            <Link to="/transactions" className="text-sm font-semibold text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5" />)}</div>
          ) : (
            <ul className="divide-y divide-slate-100" data-testid="recent-transactions">
              {data.recentTransactions.map((t: any) => (
                <li key={t.transactionId} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{t.description}</p>
                    <p className="text-xs text-slate-500">
                      {dateTime(t.date)} · {t.accountId}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                  <p className={`tabular w-28 text-right text-sm font-semibold ${t.direction === 'CREDIT' ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {t.direction === 'CREDIT' ? '+' : '−'}
                    {money(t.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="card" aria-labelledby="accounts-h">
            <h2 id="accounts-h" className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-900">
              Accounts
            </h2>
            <ul className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <li key={i} className="p-4"><Skeleton className="h-5" /></li>)
                : data.accounts.map((a: any) => (
                    <li key={a.accountNumber}>
                      <Link to={`/accounts/${a.accountNumber}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                        <span>
                          <span className="block text-sm font-medium">{ACCOUNT_LABEL[a.accountType]}</span>
                          <span className="block font-mono text-xs text-slate-500">{a.accountNumber}</span>
                        </span>
                        <span className="tabular text-sm font-semibold">{money(a.currentBalance)}</span>
                      </Link>
                    </li>
                  ))}
            </ul>
          </section>

          <section className="card" aria-labelledby="pending-h">
            <h2 id="pending-h" className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-900">
              Pending Payments
            </h2>
            {!loading && data.pendingPayments.length + data.scheduledTransfers.length === 0 ? (
              <EmptyState title="Nothing pending" />
            ) : (
              <ul className="divide-y divide-slate-100" data-testid="pending-payments">
                {!loading &&
                  data.pendingPayments.map((p: any) => (
                    <li key={p.paymentId} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span>
                        <span className="block font-medium">{p.biller}</span>
                        <span className="text-xs text-slate-500">Due {date(p.paymentDate)}</span>
                      </span>
                      <span className="tabular font-semibold">{money(p.amount)}</span>
                    </li>
                  ))}
                {!loading &&
                  data.scheduledTransfers.map((t: any) => (
                    <li key={t.transferId} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span>
                        <span className="block font-medium">Transfer to {t.toAccount}</span>
                        <span className="text-xs text-slate-500">Scheduled {t.scheduledDate}</span>
                      </span>
                      <span className="tabular font-semibold">{money(t.amount)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="notif-h">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 id="notif-h" className="font-semibold text-slate-900">
                Notifications
              </h2>
              {!loading && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{data.unreadNotifications} unread</span>}
            </div>
            <ul className="divide-y divide-slate-100">
              {!loading &&
                data.notifications.map((n: any) => (
                  <li key={n.id} className="px-5 py-3">
                    <p className={`text-sm ${n.read ? 'text-slate-600' : 'font-semibold text-slate-900'}`}>{n.title}</p>
                    <p className="text-xs text-slate-500">{n.type} · {date(n.createdAt)}</p>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      </div>

      {cashModal && !loading && (
        <CashModal
          kind={cashModal}
          accounts={data.accounts.filter((a: any) => a.accountType !== 'CREDIT')}
          onClose={() => setCashModal(null)}
          onDone={(call) => {
            setCashModal(null);
            setLastCall(call);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CashModal({ kind, accounts, onClose, onDone }: { kind: 'Deposit' | 'Withdraw'; accounts: any[]; onClose: () => void; onDone: (c: ApiCall) => void }) {
  const toast = useToast();
  const [accountId, setAccountId] = useState(accounts[0]?.accountNumber ?? '');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const { data, call } = await api.post(kind === 'Deposit' ? '/api/deposits' : '/api/withdrawals', { accountId, amount });
      toast('success', `${kind} Successful`, `${money(data.amount)} · ${data.transactionId}`);
      onDone(call);
    } catch (e) {
      const err = e as ApiError;
      setErrors({ ...err.fieldErrors, form: err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title={kind === 'Deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
      onClose={onClose}
      testId={`${kind.toLowerCase()}-modal`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy && <Spinner />}
            {kind === 'Deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {errors.form && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errors.form}</p>}
        <Field label="Account" htmlFor="cash-account" error={errors.accountId}>
          <select id="cash-account" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.accountNumber} value={a.accountNumber}>
                {a.accountNumber} — {ACCOUNT_LABEL[a.accountType]} ({money(a.availableBalance)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount" htmlFor="cash-amount" error={errors.amount} hint="Maximum $10,000 per transaction">
          <input id="cash-amount" type="number" min="0" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
