import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { api, ApiError, type ApiCall } from '../services/api';
import { ApiResponsePanel } from '../components/ApiResponsePanel';
import { ErrorState, Field, Modal, PageHeader, StatCard, StatusBadge, Spinner, TableSkeleton } from '../components/ui';
import { ACCOUNT_LABEL, date, dateTime, money } from '../utils/format';

export function AccountsPage() {
  const { data, loading, error, reload } = useApi('/api/accounts');
  const [open, setOpen] = useState(false);
  const [call, setCall] = useState<ApiCall | null>(null);

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Checking, savings and credit accounts"
        actions={
          <>
            <a className="btn-secondary" href="/api/downloads/statement" download>
              Download Statement
            </a>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              Open New Account
            </button>
          </>
        }
      />
      {call && (
        <div className="mb-6">
          <ApiResponsePanel call={call} />
        </div>
      )}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={3} cols={7} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200" data-testid="accounts-table" aria-label="Accounts">
              <thead>
                <tr>
                  {['Account Number', 'Account Type', 'Current Balance', 'Available Balance', 'Status', 'Created Date', 'Currency', ''].map((h) => (
                    <th scope="col" key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((a: any) => (
                  <tr key={a.accountNumber} data-testid="account-row" className="hover:bg-slate-50">
                    <td className="td font-mono font-semibold">
                      <Link to={`/accounts/${a.accountNumber}`} className="text-brand-700 hover:underline">
                        {a.accountNumber}
                      </Link>
                    </td>
                    <td className="td">
                      {ACCOUNT_LABEL[a.accountType]}
                      <span className="block text-xs text-slate-500">{a.nickname}</span>
                    </td>
                    <td className="td tabular font-semibold">{money(a.currentBalance)}</td>
                    <td className="td tabular">{money(a.availableBalance)}</td>
                    <td className="td">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="td">{date(a.createdDate)}</td>
                    <td className="td">{a.currency}</td>
                    <td className="td text-right">
                      <Link to={`/accounts/${a.accountNumber}`} className="btn-ghost btn-sm" aria-label={`View details for ${a.accountNumber}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && data && (
        <OpenAccountModal
          accounts={data.data}
          onClose={() => setOpen(false)}
          onDone={(c) => {
            setOpen(false);
            setCall(c);
            reload();
          }}
        />
      )}
    </div>
  );
}

function OpenAccountModal({ accounts, onClose, onDone }: { accounts: any[]; onClose: () => void; onDone: (c: ApiCall) => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ accountType: 'SAVINGS', nickname: '', initialDeposit: '', fundingAccount: accounts.find((a) => a.accountType === 'CHECKING')?.accountNumber ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const { data, call } = await api.post('/api/accounts', form);
      toast('success', 'Account opened', `${data.accountNumber} is ready to use`);
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
      title="Open New Account"
      onClose={onClose}
      testId="open-account-modal"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy && <Spinner />}Open Account
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {errors.form && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errors.form}</p>}
        <fieldset>
          <legend className="label">Account Type</legend>
          <div className="flex gap-4">
            {['CHECKING', 'SAVINGS', 'CREDIT'].map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input type="radio" name="accountType" value={t} checked={form.accountType === t} onChange={() => setForm((f) => ({ ...f, accountType: t }))} className="accent-brand-600" />
                {ACCOUNT_LABEL[t]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Nickname" htmlFor="acc-nickname">
          <input id="acc-nickname" className="input" value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} placeholder="e.g. Vacation Fund" />
        </Field>
        {form.accountType !== 'CREDIT' && (
          <>
            <Field label="Initial Deposit" htmlFor="acc-deposit" error={errors.initialDeposit} hint="Optional">
              <input id="acc-deposit" type="number" min="0" className="input" value={form.initialDeposit} onChange={(e) => setForm((f) => ({ ...f, initialDeposit: e.target.value }))} />
            </Field>
            <Field label="Funding Account" htmlFor="acc-funding" error={errors.fundingAccount}>
              <select id="acc-funding" className="input" value={form.fundingAccount} onChange={(e) => setForm((f) => ({ ...f, fundingAccount: e.target.value }))}>
                {accounts
                  .filter((a) => a.accountType !== 'CREDIT')
                  .map((a) => (
                    <option key={a.accountNumber} value={a.accountNumber}>
                      {a.accountNumber} ({money(a.availableBalance)})
                    </option>
                  ))}
              </select>
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}

export function AccountDetailsPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(`/api/accounts/${id}`);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const a = data?.data;
  return (
    <div>
      <PageHeader
        title={loading ? 'Account' : `${ACCOUNT_LABEL[a.accountType]} · ${a.accountNumber}`}
        subtitle={a?.nickname}
        actions={
          <>
            <a className="btn-secondary" href={`/api/downloads/statement?accountId=${id}`}>
              Download Statement
            </a>
            <Link className="btn-primary" to={`/transactions?accountId=${id}`}>
              All Transactions
            </Link>
          </>
        }
      />
      {loading ? (
        <TableSkeleton rows={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="account-summary">
            <StatCard label="Current Balance" value={money(a.currentBalance)} testId="account-current-balance" />
            <StatCard label="Available Balance" value={money(a.availableBalance)} testId="account-available-balance" />
            <StatCard label="Total Credits" value={money(a.totalCredits)} />
            <StatCard label="Total Debits" value={money(a.totalDebits)} />
          </div>
          <dl className="card mt-6 grid gap-4 p-5 sm:grid-cols-4">
            {[
              ['Status', <StatusBadge key="s" status={a.status} />],
              ['Currency', a.currency],
              ['Created Date', date(a.createdDate)],
              ['Transactions', a.transactionCount],
              ...(a.creditLimit ? [['Credit Limit', money(a.creditLimit)]] : []),
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-xs font-semibold uppercase text-slate-500">{k}</dt>
                <dd className="mt-1 text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <section className="card mt-6 overflow-hidden">
            <h2 className="border-b border-slate-200 px-5 py-4 font-semibold">Recent Activity</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200" aria-label="Recent account activity">
                <thead>
                  <tr>
                    {['Date', 'Transaction ID', 'Description', 'Status', 'Amount', 'Balance After'].map((h) => (
                      <th scope="col" key={h} className="th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {a.recentTransactions.map((t: any) => (
                    <tr key={t.transactionId}>
                      <td className="td">{dateTime(t.date)}</td>
                      <td className="td font-mono text-xs">{t.transactionId}</td>
                      <td className="td">{t.description}</td>
                      <td className="td">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className={`td tabular font-semibold ${t.direction === 'CREDIT' ? 'text-emerald-600' : ''}`}>{(t.direction === 'CREDIT' ? '+' : '−') + money(t.amount)}</td>
                      <td className="td tabular">{money(t.balanceAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
