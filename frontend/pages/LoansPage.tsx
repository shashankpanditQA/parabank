import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { api, ApiError, type ApiCall } from '../services/api';
import { ApiResponsePanel } from '../components/ApiResponsePanel';
import { Alert, EmptyState, Field, LoadingOverlay, PageHeader, StatusBadge, Spinner, TableSkeleton } from '../components/ui';
import { date, money } from '../utils/format';

const LOAN_TYPES = ['Personal Loan', 'Home Loan', 'Car Loan', 'Education Loan'];
const EMPLOYMENT = ['Salaried', 'Self-Employed', 'Business Owner', 'Student', 'Retired'];

export function LoansPage() {
  const toast = useToast();
  const loans = useApi('/api/loans');
  const [form, setForm] = useState({ loanType: 'Personal Loan', requestedAmount: '', tenure: '36', employmentType: '', monthlyIncome: '', existingEmi: '0', purpose: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [call, setCall] = useState<ApiCall | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    setResult(null);
    const minDelay = new Promise((r) => setTimeout(r, 900));
    try {
      const [{ data, call }] = await Promise.all([api.post('/api/loans', form), minDelay]);
      setResult(data);
      setCall(call);
      if (data.status === 'REJECTED') toast('error', 'Loan application rejected', data.decisionReason);
      else toast('success', 'Application submitted', `${data.applicationId} is under review`);
      loans.reload();
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
      <PageHeader
        title="Loans"
        subtitle="Personal, home, car and education loans"
        actions={
          <a className="btn-secondary" href="/api/downloads/loan-agreement">
            Download Loan Agreement
          </a>
        }
      />
      <div className="grid gap-6 xl:grid-cols-5">
        <form className="card grid gap-4 p-6 sm:grid-cols-2 xl:col-span-2" onSubmit={submit} noValidate aria-label="Loan application form">
          <h2 className="font-semibold text-slate-900 sm:col-span-2">Apply for a Loan</h2>
          {error && (
            <div className="sm:col-span-2">
              <Alert kind="error" testId="loan-error">
                {error.message}
              </Alert>
            </div>
          )}
          <div className="sm:col-span-2">
            <Field label="Loan Type" htmlFor="loanType" error={errors.loanType} required>
              <select id="loanType" className="input" value={form.loanType} onChange={set('loanType')}>
                {LOAN_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Requested Amount" htmlFor="requestedAmount" error={errors.requestedAmount} required>
            <input id="requestedAmount" type="number" min="0" className="input" value={form.requestedAmount} onChange={set('requestedAmount')} />
          </Field>
          <Field label="Tenure (months)" htmlFor="tenure" error={errors.tenure} required>
            <input id="tenure" type="number" min="6" className="input" value={form.tenure} onChange={set('tenure')} />
          </Field>
          <Field label="Employment Type" htmlFor="employmentType" error={errors.employmentType} required>
            <select id="employmentType" className="input" value={form.employmentType} onChange={set('employmentType')}>
              <option value="">Select</option>
              {EMPLOYMENT.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Monthly Income" htmlFor="monthlyIncome" error={errors.monthlyIncome} required>
            <input id="monthlyIncome" type="number" min="0" className="input" value={form.monthlyIncome} onChange={set('monthlyIncome')} />
          </Field>
          <Field label="Existing EMI" htmlFor="existingEmi" error={errors.existingEmi} hint="Total monthly instalments on other loans">
            <input id="existingEmi" type="number" min="0" className="input" value={form.existingEmi} onChange={set('existingEmi')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Purpose" htmlFor="purpose" error={errors.purpose} required>
              <textarea id="purpose" rows={3} className="input" value={form.purpose} onChange={set('purpose')} />
            </Field>
          </div>
          {busy && (
            <div className="sm:col-span-2">
              <LoadingOverlay text="Submitting Application..." />
            </div>
          )}
          <div className="sm:col-span-2">
            <button className="btn-primary w-full" disabled={busy} data-testid="loan-submit">
              {busy && <Spinner />}Submit Application
            </button>
          </div>
          {result && (
            <div className="sm:col-span-2">
              <Alert kind={result.status === 'REJECTED' ? 'error' : 'success'} testId="loan-result">
                <p className="font-semibold">{result.status === 'REJECTED' ? 'Loan Rejected' : 'Application Submitted'}</p>
                <p>
                  Application ID: <span className="font-mono font-semibold" data-testid="loan-application-id">{result.applicationId}</span> · Estimated EMI {money(result.estimatedEmi)}
                </p>
                {result.decisionReason && <p className="mt-1">{result.decisionReason}</p>}
              </Alert>
            </div>
          )}
        </form>

        <section className="card overflow-hidden xl:col-span-3" aria-label="My loan applications">
          <h2 className="border-b border-slate-200 px-5 py-4 font-semibold">My Loan Applications</h2>
          {loans.loading && !loans.data ? (
            <TableSkeleton rows={3} cols={6} />
          ) : !loans.data?.data.length ? (
            <EmptyState title="No loan applications" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200" data-testid="loans-table">
                <thead>
                  <tr>
                    {['Application ID', 'Type', 'Amount', 'Tenure', 'Rate', 'EMI', 'Applied', 'Status', ''].map((h) => (
                      <th scope="col" key={h} className="th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loans.data.data.map((l: any) => (
                    <tr key={l.applicationId} data-testid="loan-row">
                      <td className="td font-mono text-xs">{l.applicationId}</td>
                      <td className="td font-medium">{l.loanType}</td>
                      <td className="td tabular">{money(l.requestedAmount)}</td>
                      <td className="td">{l.tenureMonths} mo</td>
                      <td className="td">{l.interestRate}%</td>
                      <td className="td tabular">{money(l.estimatedEmi)}</td>
                      <td className="td">{date(l.createdAt)}</td>
                      <td className="td">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="td">
                        <a className="btn-ghost btn-sm" href={`/api/downloads/loan-agreement/${l.applicationId}`} aria-label={`Download agreement for ${l.applicationId}`}>
                          Agreement
                        </a>
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
