import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { api, ApiError, type ApiCall } from '../services/api';
import { ApiResponsePanel } from '../components/ApiResponsePanel';
import { Alert, EmptyState, Field, LoadingOverlay, PageHeader, StatusBadge, Spinner, TableSkeleton, Tabs } from '../components/ui';
import { ACCOUNT_LABEL, date, isoDay, money } from '../utils/format';

export function PaymentsPage() {
  const toast = useToast();
  const billers = useApi('/api/payments/billers');
  const accounts = useApi('/api/accounts');
  const [filter, setFilter] = useState<'' | 'SUCCESS' | 'SCHEDULED' | 'FAILED'>('');
  const history = useApi(`/api/payments${filter ? `?status=${filter}` : ''}`);
  const [form, setForm] = useState({ biller: '', customerNumber: '', amount: '', accountId: '', paymentDate: isoDay() });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [call, setCall] = useState<ApiCall | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    setResult(null);
    const minDelay = new Promise((r) => setTimeout(r, 700));
    try {
      const [{ data, call }] = await Promise.all([api.post('/api/payments', { ...form, accountId: form.accountId || accounts.data?.data[0]?.accountNumber }), minDelay]);
      setResult(data);
      setCall(call);
      toast('success', data.status === 'SCHEDULED' ? 'Payment scheduled' : 'Payment completed', `${data.biller} · ${money(data.amount)} · ${data.paymentId}`);
      setForm((f) => ({ ...f, customerNumber: '', amount: '' }));
      history.reload();
      accounts.reload();
    } catch (err) {
      await minDelay;
      const ex = err as ApiError;
      setErrors(ex.fieldErrors);
      setError(ex);
      setCall(ex.call);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Bill Payments" subtitle="Pay utilities, phone, internet, credit card and insurance bills" />
      <div className="grid gap-6 xl:grid-cols-5">
        <form className="card space-y-4 p-6 xl:col-span-2" onSubmit={submit} noValidate aria-label="Bill payment form">
          <h2 className="font-semibold text-slate-900">Pay a Bill</h2>
          {error && (
            <Alert kind="error" testId="payment-error">
              {error.message} <span className="code">{error.errorCode}</span>
            </Alert>
          )}
          <Field label="Biller" htmlFor="biller" error={errors.biller} required>
            <select id="biller" className="input" value={form.biller} onChange={set('biller')}>
              <option value="">Select a biller</option>
              {billers.data?.data.map((b: any) => (
                <option key={b.code} value={b.name}>
                  {b.name} — {b.provider}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer Number" htmlFor="customerNumber" error={errors.customerNumber} required hint="Your account number with the biller">
            <input id="customerNumber" className="input" value={form.customerNumber} onChange={set('customerNumber')} placeholder="e.g. ELE123456" />
          </Field>
          <Field label="Amount" htmlFor="pay-amount" error={errors.amount} required>
            <input id="pay-amount" type="number" min="0" step="0.01" className="input" value={form.amount} onChange={set('amount')} />
          </Field>
          <Field label="Payment Account" htmlFor="pay-account" error={errors.accountId} required>
            <select id="pay-account" className="input" value={form.accountId} onChange={set('accountId')}>
              {accounts.data?.data.map((a: any) => (
                <option key={a.accountNumber} value={a.accountNumber}>
                  {a.accountNumber} — {ACCOUNT_LABEL[a.accountType]} ({money(a.availableBalance)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment Date" htmlFor="paymentDate" error={errors.paymentDate} hint="Future dates schedule the payment">
            <input id="paymentDate" type="date" className="input" min={isoDay()} value={form.paymentDate} onChange={set('paymentDate')} />
          </Field>
          {busy && <LoadingOverlay text="Processing Payment..." />}
          <button className="btn-primary w-full" disabled={busy} data-testid="payment-submit">
            {busy && <Spinner />}Pay Bill
          </button>
          {result && (
            <Alert kind="success" testId="payment-success">
              <p className="font-semibold">{result.status === 'SCHEDULED' ? 'Payment Scheduled' : 'Payment Successful'}</p>
              <p>
                Payment ID: <span className="font-mono font-semibold" data-testid="payment-id">{result.paymentId}</span>
              </p>
            </Alert>
          )}
        </form>

        <section className="card overflow-hidden xl:col-span-3" aria-label="Payment history">
          <div className="px-5 pt-4">
            <h2 className="mb-3 font-semibold text-slate-900">Payment History</h2>
            <Tabs
              label="Payment status"
              value={filter}
              onChange={setFilter}
              tabs={[
                { id: '', label: 'All' },
                { id: 'SUCCESS', label: 'Successful' },
                { id: 'SCHEDULED', label: 'Scheduled' },
                { id: 'FAILED', label: 'Failed' },
              ]}
            />
          </div>
          {history.loading && !history.data ? (
            <TableSkeleton rows={5} cols={5} />
          ) : !history.data?.data.length ? (
            <EmptyState title="No payments" message="No payments match this filter." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200" data-testid="payments-table">
                <thead>
                  <tr>
                    {['Payment ID', 'Biller', 'Customer No.', 'Date', 'Amount', 'Channel', 'Status'].map((h) => (
                      <th scope="col" key={h} className="th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.data.data.map((p: any) => (
                    <tr key={p.paymentId} data-testid="payment-row">
                      <td className="td font-mono text-xs">{p.paymentId}</td>
                      <td className="td font-medium">{p.biller}</td>
                      <td className="td">{p.customerNumber ?? (p.cardLast4 ? `Card •••• ${p.cardLast4}` : '—')}</td>
                      <td className="td">{date(p.paymentDate)}</td>
                      <td className="td tabular font-semibold">{money(p.amount)}</td>
                      <td className="td">{p.channel}</td>
                      <td className="td">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {call && (
        <div className="mt-6">
          <ApiResponsePanel call={call} />
        </div>
      )}
    </div>
  );
}
