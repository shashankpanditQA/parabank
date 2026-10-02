import { useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useApi, useBeforeUnload, usePaymentMessages } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { api, ApiError, type ApiCall } from '../services/api';
import { ApiResponsePanel } from '../components/ApiResponsePanel';
import { Alert, EmptyState, ErrorState, Field, LoadingOverlay, PageHeader, StatusBadge, Spinner, TableSkeleton } from '../components/ui';
import { ACCOUNT_LABEL, dateTime, isoDay, money } from '../utils/format';

type Step = 'form' | 'review' | 'processing' | 'done';
const EMPTY = { fromAccount: '', transferType: 'OWN_ACCOUNT', toAccount: '', beneficiaryId: '', amount: '', description: '', scheduleTransfer: false, transferDate: '' };

export function TransfersPage() {
  const toast = useToast();
  const accounts = useApi('/api/accounts');
  const beneficiaries = useApi('/api/beneficiaries');
  const history = useApi('/api/transfers');
  const recentTx = useApi('/api/transactions?pageSize=5');
  const [form, setForm] = useState(EMPTY);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<any>(null);
  const [call, setCall] = useState<ApiCall | null>(null);

  const own = useMemo(() => (accounts.data?.data ?? []) as any[], [accounts.data]);
  const sources = own.filter((a) => a.accountType !== 'CREDIT');
  useEffect(() => {
    if (!form.fromAccount && sources[0]) setForm((f) => ({ ...f, fromAccount: sources[0].accountNumber, toAccount: own.find((a) => a.accountNumber !== sources[0].accountNumber)?.accountNumber ?? '' }));
  }, [sources, own, form.fromAccount]);

  const dirty = step !== 'done' && (form.amount !== '' || form.description !== '' || otp !== '');
  useBeforeUnload(dirty);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('You have an unsaved transfer. Are you sure you want to leave this page?')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);

  const set = (k: keyof typeof EMPTY, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const from = own.find((a) => a.accountNumber === form.fromAccount);
  const toLabel = form.transferType === 'OWN_ACCOUNT' ? form.toAccount : beneficiaries.data?.data.find((b: any) => b.id === form.beneficiaryId)?.name;

  const review = () => {
    const e: Record<string, string> = {};
    const amt = Number(form.amount);
    if (!form.fromAccount) e.fromAccount = 'Select the account to transfer from';
    if (form.transferType === 'OWN_ACCOUNT' && !form.toAccount) e.toAccount = 'Select the destination account';
    if (form.transferType === 'OWN_ACCOUNT' && form.toAccount === form.fromAccount) e.toAccount = 'Destination must differ from source';
    if (form.transferType === 'BENEFICIARY' && !form.beneficiaryId) e.beneficiaryId = 'Select a beneficiary';
    if (!form.amount) e.amount = 'Amount is required';
    else if (!(amt > 0)) e.amount = 'Amount must be greater than zero';
    if (form.scheduleTransfer && !form.transferDate) e.transferDate = 'Choose a transfer date';
    setErrors(e);
    setApiError(null);
    if (!Object.keys(e).length) setStep('review');
  };

  const confirm = async () => {
    setStep('processing');
    setApiError(null);
    const minDelay = new Promise((r) => setTimeout(r, 800)); // keep "Processing Transfer..." visible long enough to assert
    try {
      const [{ data, call }] = await Promise.all([api.post('/api/transfers', { ...form, amount: Number(form.amount), otp }), minDelay]);
      setResult(data);
      setCall(call);
      setStep('done');
      toast('success', data.status === 'SCHEDULED' ? 'Transfer scheduled' : 'Transfer completed', `${money(data.amount)} · ${data.transactionId}`);
      accounts.reload();
      history.reload();
      recentTx.reload();
    } catch (err) {
      await minDelay;
      const e = err as ApiError;
      setApiError(e);
      setCall(e.call);
      setErrors(e.fieldErrors);
      setStep(e.errorCode === 'INVALID_OTP' || e.errorCode === 'OTP_REQUIRED' ? 'review' : 'form');
      toast('error', 'Transfer could not be completed', e.message);
    }
  };

  const reset = (ask = true) => {
    if (ask && dirty && !window.confirm('Discard this transfer?')) return;
    setForm({ ...EMPTY, fromAccount: form.fromAccount, toAccount: form.toAccount });
    setOtp('');
    setErrors({});
    setApiError(null);
    setResult(null);
    setStep('form');
  };

  // ---------------- Secure gateway (popup + iframe + nested iframe + confirm dialog)
  const [merchant, setMerchant] = useState('Global Electronics Store');
  const [gatewayAmount, setGatewayAmount] = useState('249.00');
  const [gatewayCall, setGatewayCall] = useState<ApiCall | null>(null);
  usePaymentMessages((msg) => {
    if (msg.ok) toast('success', 'Payment Successful', `${money(msg.body.amount)} paid to ${msg.body.merchant} · ${msg.body.paymentId}`);
    else toast('error', 'Payment Failed', msg.body?.message ?? 'Payment failed');
    setGatewayCall({
      id: Date.now(),
      method: 'POST',
      url: '/api/payments',
      requestHeaders: { 'Content-Type': 'application/json' },
      requestBody: msg.request?.body ?? null,
      status: msg.status,
      statusText: msg.ok ? 'Created' : '',
      responseHeaders: {},
      responseBody: msg.body,
      durationMs: msg.elapsedMs ?? 0,
      at: new Date().toISOString(),
      ok: msg.ok,
    });
    recentTx.reload();
    accounts.reload();
  });
  const openGateway = () => {
    const ref = `CHK-${Math.floor(100000 + Math.random() * 900000)}`;
    window.open(`/payment-gateway/checkout?amount=${encodeURIComponent(gatewayAmount)}&merchant=${encodeURIComponent(merchant)}&ref=${ref}`, 'secure-payment-gateway', 'width=620,height=900');
  };

  if (accounts.error) return <ErrorState error={accounts.error} onRetry={accounts.reload} />;

  return (
    <div>
      <PageHeader title="Transfer Money" subtitle="Move money between your accounts or send it to a beneficiary" />
      <div className="grid gap-6 xl:grid-cols-5">
        <section className="card p-6 xl:col-span-3" aria-label="Transfer form">
          {apiError && (
            <div className="mb-4">
              <Alert kind="error" testId="transfer-error">
                <p className="font-semibold">{apiError.message}</p>
                <p className="mt-0.5 text-xs">
                  Error code: <span className="code" data-testid="transfer-error-code">{apiError.errorCode}</span>
                  {apiError.body?.availableBalance !== undefined && <> · Available: {money(apiError.body.availableBalance)}</>}
                </p>
              </Alert>
            </div>
          )}

          {step === 'form' && (
            <form
              className="grid gap-4 sm:grid-cols-2"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                review();
              }}
            >
              <Field label="From Account" htmlFor="fromAccount" error={errors.fromAccount} required>
                <select id="fromAccount" className="input" value={form.fromAccount} onChange={(e) => set('fromAccount', e.target.value)}>
                  {sources.map((a) => (
                    <option key={a.accountNumber} value={a.accountNumber}>
                      {a.accountNumber} — {ACCOUNT_LABEL[a.accountType]} ({money(a.availableBalance)})
                    </option>
                  ))}
                </select>
              </Field>
              <fieldset>
                <legend className="label">Transfer Type</legend>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="transferType" className="accent-brand-600" checked={form.transferType === 'OWN_ACCOUNT'} onChange={() => set('transferType', 'OWN_ACCOUNT')} />
                    Own Account
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="transferType" className="accent-brand-600" checked={form.transferType === 'BENEFICIARY'} onChange={() => set('transferType', 'BENEFICIARY')} />
                    Beneficiary
                  </label>
                </div>
              </fieldset>
              {form.transferType === 'OWN_ACCOUNT' ? (
                <Field label="To Account" htmlFor="toAccount" error={errors.toAccount} required>
                  <select id="toAccount" className="input" value={form.toAccount} onChange={(e) => set('toAccount', e.target.value)}>
                    <option value="">Select account</option>
                    {own
                      .filter((a) => a.accountNumber !== form.fromAccount)
                      .map((a) => (
                        <option key={a.accountNumber} value={a.accountNumber}>
                          {a.accountNumber} — {ACCOUNT_LABEL[a.accountType]}
                        </option>
                      ))}
                  </select>
                </Field>
              ) : (
                <Field label="Beneficiary" htmlFor="beneficiaryId" error={errors.beneficiaryId} required>
                  <select id="beneficiaryId" className="input" value={form.beneficiaryId} onChange={(e) => set('beneficiaryId', e.target.value)}>
                    <option value="">Select beneficiary</option>
                    {beneficiaries.data?.data.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.bank} {b.maskedAccountNumber}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Amount" htmlFor="amount" error={errors.amount} required hint={from ? `Available: ${money(from.availableBalance)}` : undefined}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input id="amount" type="number" min="0" step="0.01" className="input pl-7" placeholder="0.00" value={form.amount} aria-invalid={!!errors.amount} onChange={(e) => set('amount', e.target.value)} />
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description" htmlFor="description">
                  <input id="description" className="input" maxLength={80} placeholder="What's this transfer for?" value={form.description} onChange={(e) => set('description', e.target.value)} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.scheduleTransfer} onChange={(e) => set('scheduleTransfer', e.target.checked)} />
                Schedule Transfer
              </label>
              <Field label="Transfer Date" htmlFor="transferDate" error={errors.transferDate}>
                <input id="transferDate" type="date" className="input" min={isoDay()} disabled={!form.scheduleTransfer} value={form.transferDate} onChange={(e) => set('transferDate', e.target.value)} />
              </Field>
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className="btn-primary" data-testid="transfer-submit">
                  Review Transfer
                </button>
                <button type="button" className="btn-secondary" onClick={() => reset()}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {(step === 'review' || step === 'processing') && (
            <div data-testid="transfer-review">
              <h2 className="text-lg font-semibold">Review Transfer</h2>
              <dl className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {[
                  ['From', form.fromAccount],
                  ['To', toLabel],
                  ['Amount', money(Number(form.amount))],
                  ['Description', form.description || '—'],
                  ['When', form.scheduleTransfer ? form.transferDate : 'Immediately'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-semibold" data-testid={`review-${String(k).toLowerCase()}`}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 max-w-xs">
                <Field label="OTP" htmlFor="otp" error={errors.otp} hint="Demo OTP: 123456">
                  <input id="otp" className="input font-mono tracking-widest" inputMode="numeric" maxLength={6} placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                </Field>
              </div>
              {step === 'processing' && (
                <div className="mt-4">
                  <LoadingOverlay text="Processing Transfer..." />
                </div>
              )}
              <div className="mt-5 flex gap-2">
                <button className="btn-primary" onClick={confirm} disabled={step === 'processing'} data-testid="transfer-confirm">
                  {step === 'processing' && <Spinner />}Confirm Transfer
                </button>
                <button className="btn-secondary" onClick={() => setStep('form')} disabled={step === 'processing'}>
                  Back
                </button>
                <button className="btn-ghost" onClick={() => reset()} disabled={step === 'processing'}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div data-testid="transfer-success">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-lg text-emerald-700">✓</span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{result.status === 'SCHEDULED' ? 'Transfer Scheduled' : 'Transfer Successful'}</h2>
                  <p className="text-sm text-slate-500">{result.message}</p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Transaction ID</dt>
                  <dd className="font-mono font-semibold" data-testid="transfer-transaction-id">
                    {result.transactionId}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-semibold">{money(result.amount)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">From → To</dt>
                  <dd className="font-semibold">
                    {result.fromAccount} → {result.beneficiaryName ?? result.toAccount}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <StatusBadge status={result.status} />
                  </dd>
                </div>
              </dl>
              <button className="btn-primary mt-5" onClick={() => reset(false)}>
                Make Another Transfer
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-6 xl:col-span-2">
          <section className="card p-6" aria-label="Secure card payment">
            <h2 className="font-semibold text-slate-900">Pay a Merchant by Card</h2>
            <p className="mt-1 text-sm text-slate-500">Opens the Secure Payment Gateway in a new window with card entry, nested OTP verification and a confirmation dialog.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Merchant" htmlFor="gw-merchant">
                <input id="gw-merchant" className="input" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              </Field>
              <Field label="Payment Amount" htmlFor="gw-amount">
                <input id="gw-amount" type="number" min="1" step="0.01" className="input" value={gatewayAmount} onChange={(e) => setGatewayAmount(e.target.value)} />
              </Field>
            </div>
            <button className="btn-primary mt-4 w-full" onClick={openGateway}>
              Open Secure Payment Gateway
            </button>
          </section>
          <section className="card overflow-hidden" aria-label="Latest transactions">
            <h2 className="border-b border-slate-200 px-5 py-3 font-semibold">Latest Transactions</h2>
            {recentTx.loading && !recentTx.data ? (
              <TableSkeleton rows={4} cols={3} />
            ) : (
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100" data-testid="latest-transactions" aria-label="Latest transactions">
                <tbody className="divide-y divide-slate-100">
                  {recentTx.data?.data.map((t: any) => (
                    <tr key={t.transactionId} data-testid="transaction-row">
                      <td className="td">
                        <span className="block max-w-[11rem] truncate font-medium">{t.description}</span>
                        <span className="font-mono text-xs text-slate-500">{t.transactionId}</span>
                      </td>
                      <td className="td">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="td tabular text-right font-semibold">{(t.direction === 'CREDIT' ? '+' : '-') + money(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>
        </aside>
      </div>

      {(call || gatewayCall) && (
        <div className="mt-6 space-y-4">
          {gatewayCall && <ApiResponsePanel call={gatewayCall} title="GATEWAY API RESPONSE" />}
          {call && <ApiResponsePanel call={call} />}
        </div>
      )}

      <section className="card mt-6 overflow-hidden" aria-label="Transfer history">
        <h2 className="border-b border-slate-200 px-5 py-4 font-semibold">Transfer History</h2>
        {history.loading && !history.data ? (
          <TableSkeleton rows={3} cols={6} />
        ) : !history.data?.data.length ? (
          <EmptyState title="No transfers yet" message="Transfers you make will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200" data-testid="transfer-history">
              <thead>
                <tr>
                  {['Transfer ID', 'Date', 'From', 'To', 'Amount', 'Type', 'Status'].map((h) => (
                    <th scope="col" key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.data.data.map((t: any) => (
                  <tr key={t.transferId}>
                    <td className="td font-mono text-xs">{t.transferId}</td>
                    <td className="td">{dateTime(t.createdAt)}</td>
                    <td className="td font-mono text-xs">{t.fromAccount}</td>
                    <td className="td font-mono text-xs">{t.toAccount}</td>
                    <td className="td tabular font-semibold">{money(t.amount)}</td>
                    <td className="td">{t.transferType === 'OWN_ACCOUNT' ? 'Own Account' : 'Beneficiary'}</td>
                    <td className="td">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
