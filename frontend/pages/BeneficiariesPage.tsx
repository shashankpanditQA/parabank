import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { api, ApiError, type ApiCall } from '../services/api';
import { ApiResponsePanel } from '../components/ApiResponsePanel';
import { EmptyState, ErrorState, Field, Modal, PageHeader, Spinner, TableSkeleton } from '../components/ui';
import { date } from '../utils/format';

const BANKS = ['Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank', 'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Capital One'];
const EMPTY = { name: '', accountNumber: '', bank: '', ifsc: '', nickname: '' };

export function BeneficiariesPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, loading, error, reload } = useApi(`/api/beneficiaries${debounced ? `?search=${encodeURIComponent(debounced)}` : ''}`);
  const [editing, setEditing] = useState<null | { mode: 'add' } | { mode: 'edit'; item: any }>(null);
  const [call, setCall] = useState<ApiCall | null>(null);

  const remove = async (b: any) => {
    const ok = window.confirm(`Are you sure you want to delete this beneficiary?\nBeneficiary: ${b.name} (${b.bank} ${b.maskedAccountNumber})`);
    if (!ok) {
      toast('info', 'Delete cancelled', `${b.name} was not deleted`);
      return;
    }
    try {
      const res = await api.del(`/api/beneficiaries/${b.id}`);
      setCall(res.call);
      toast('success', 'Beneficiary deleted', res.data.message);
      reload();
    } catch (e) {
      const err = e as ApiError;
      setCall(err.call);
      toast('error', 'Delete failed', err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Beneficiaries"
        subtitle="People and accounts you can send money to"
        actions={
          <button className="btn-primary" onClick={() => setEditing({ mode: 'add' })}>
            Add Beneficiary
          </button>
        }
      />
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <label htmlFor="ben-search" className="sr-only">
            Search beneficiaries
          </label>
          <input id="ben-search" type="search" className="input max-w-sm" placeholder="Search Beneficiary" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading && !data ? (
          <TableSkeleton rows={5} cols={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data.data.length ? (
          <EmptyState title="No beneficiaries found" message={debounced ? `Nothing matches “${debounced}”.` : 'Add someone to start sending money.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200" data-testid="beneficiary-table" aria-label="Beneficiaries">
              <thead>
                <tr>
                  {['Name', 'Nickname', 'Account Number', 'Bank', 'IFSC', 'Added', 'Actions'].map((h) => (
                    <th scope="col" key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((b: any) => (
                  <tr key={b.id} data-testid="beneficiary-row" className="hover:bg-slate-50">
                    <td className="td font-semibold text-slate-900">{b.name}</td>
                    <td className="td">{b.nickname ?? '—'}</td>
                    <td className="td font-mono text-xs">{b.accountNumber}</td>
                    <td className="td">{b.bank}</td>
                    <td className="td font-mono text-xs">{b.ifsc}</td>
                    <td className="td">{date(b.createdAt)}</td>
                    <td className="td">
                      <div className="flex gap-1">
                        <button className="btn-ghost btn-sm" onClick={() => setEditing({ mode: 'edit', item: b })}>
                          Edit
                        </button>
                        <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => remove(b)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {call && (
        <div className="mt-6">
          <ApiResponsePanel call={call} />
        </div>
      )}
      {editing && (
        <BeneficiaryModal
          initial={editing.mode === 'edit' ? editing.item : null}
          onClose={() => setEditing(null)}
          onDone={(c) => {
            setCall(c);
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function BeneficiaryModal({ initial, onClose, onDone }: { initial: any | null; onClose: () => void; onDone: (c: ApiCall) => void }) {
  const toast = useToast();
  const [form, setForm] = useState(initial ? { name: initial.name, accountNumber: initial.accountNumber, bank: initial.bank, ifsc: initial.ifsc, nickname: initial.nickname ?? '' } : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const res = initial ? await api.put(`/api/beneficiaries/${initial.id}`, form) : await api.post('/api/beneficiaries', form);
      toast('success', initial ? 'Beneficiary updated' : 'Beneficiary added', `${res.data.name} · ${res.data.id}`);
      onDone(res.call);
    } catch (e) {
      const err = e as ApiError;
      setErrors({ ...err.fieldErrors, ...(err.errorCode === 'VALIDATION_ERROR' ? {} : { form: err.message }) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title={initial ? 'Edit Beneficiary' : 'Add Beneficiary'}
      onClose={onClose}
      testId="beneficiary-modal"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={busy} data-testid="beneficiary-save">
            {busy && <Spinner />}
            {initial ? 'Save Changes' : 'Add Beneficiary'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {errors.form && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2" role="alert" data-testid="beneficiary-form-error">
            {errors.form}
          </p>
        )}
        <div className="sm:col-span-2">
          <Field label="Name" htmlFor="ben-name" error={errors.name} required>
            <input id="ben-name" className="input" value={form.name} onChange={set('name')} />
          </Field>
        </div>
        <Field label="Account Number" htmlFor="ben-account" error={errors.accountNumber} required>
          <input id="ben-account" className="input font-mono" inputMode="numeric" value={form.accountNumber} onChange={set('accountNumber')} />
        </Field>
        <Field label="Bank" htmlFor="ben-bank" error={errors.bank} required>
          <select id="ben-bank" className="input" value={form.bank} onChange={set('bank')}>
            <option value="">Select bank</option>
            {BANKS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field label="IFSC" htmlFor="ben-ifsc" error={errors.ifsc} required hint="Format: ABCD0123456">
          <input id="ben-ifsc" className="input font-mono uppercase" value={form.ifsc} onChange={set('ifsc')} />
        </Field>
        <Field label="Nickname" htmlFor="ben-nickname" error={errors.nickname}>
          <input id="ben-nickname" className="input" value={form.nickname} onChange={set('nickname')} />
        </Field>
      </div>
    </Modal>
  );
}
