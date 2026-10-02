import { useRef, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { api, ApiError, type ApiCall } from '../services/api';
import { ApiResponsePanel } from '../components/ApiResponsePanel';
import { Alert, Badge, EmptyState, ErrorState, Field, LoadingOverlay, PageHeader, StatusBadge, Spinner, TableSkeleton, Tabs } from '../components/ui';
import { bytes, cx, dateTime } from '../utils/format';

const TYPES = ['Transaction', 'Security', 'Payment', 'Loan', 'Promotion'];
const TYPE_TONE: Record<string, 'brand' | 'red' | 'sky' | 'violet' | 'amber'> = { Transaction: 'brand', Security: 'red', Payment: 'sky', Loan: 'violet', Promotion: 'amber' };

export function NotificationsPage() {
  const toast = useToast();
  const [status, setStatus] = useState<'' | 'unread' | 'read'>('');
  const [type, setType] = useState('');
  const query = new URLSearchParams({ ...(status && { status }), ...(type && { type }) }).toString();
  const { data, loading, error, reload } = useApi(`/api/notifications${query ? `?${query}` : ''}`);

  const act = async (fn: () => Promise<any>, msg?: string) => {
    try {
      await fn();
      if (msg) toast('success', msg);
      reload();
    } catch (e) {
      toast('error', 'Action failed', (e as ApiError).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={data ? `${data.unreadCount} unread` : 'Alerts about your accounts'}
        actions={
          <button className="btn-secondary" disabled={!data?.unreadCount} onClick={() => act(() => api.post('/api/notifications/read-all'), 'All notifications marked as read')}>
            Mark all as read
          </button>
        }
      />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mb-4">
            <Tabs label="Read status" value={status} onChange={setStatus} tabs={[{ id: '', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'read', label: 'Read' }]} />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="ntf-type" className="text-sm text-slate-600">
              Type
            </label>
            <select id="ntf-type" className="input w-44" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        {loading && !data ? (
          <TableSkeleton rows={6} cols={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data.data.length ? (
          <EmptyState title="You're all caught up" message="No notifications match this filter." />
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="notification-list">
            {data.data.map((n: any) => (
              <li key={n.id} data-testid="notification-item" data-read={n.read} className={cx('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center', !n.read && 'bg-brand-50/40')}>
                <span className={cx('hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block', n.read ? 'bg-transparent' : 'bg-brand-500')} aria-label={n.read ? 'Read' : 'Unread'} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cx('text-sm', n.read ? 'text-slate-700' : 'font-semibold text-slate-900')}>{n.title}</p>
                    <Badge tone={TYPE_TONE[n.type]}>{n.type}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{dateTime(n.createdAt)}</p>
                </div>
                <div className="flex gap-1">
                  {n.read ? (
                    <button className="btn-ghost btn-sm" onClick={() => act(() => api.patch(`/api/notifications/${n.id}/unread`))}>
                      Mark as unread
                    </button>
                  ) : (
                    <button className="btn-ghost btn-sm" onClick={() => act(() => api.patch(`/api/notifications/${n.id}/read`))}>
                      Mark as read
                    </button>
                  )}
                  <button className="btn-ghost btn-sm text-red-600" aria-label={`Delete notification ${n.title}`} onClick={() => act(() => api.del(`/api/notifications/${n.id}`), 'Notification deleted')}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const CATEGORIES = ['Account', 'Card Services', 'Transactions', 'Loans', 'Online Banking', 'Other'];

export function SupportPage() {
  const toast = useToast();
  const tickets = useApi('/api/support/tickets');
  const [form, setForm] = useState({ category: '', subject: '', description: '', priority: 'Medium' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [call, setCall] = useState<ApiCall | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setResult(null);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('attachment', file);
    try {
      const { data, call } = await api.post('/api/support/tickets', fd);
      setResult(data);
      setCall(call);
      toast('success', 'Ticket created', `${data.ticketId} · ${data.status}`);
      setForm({ category: '', subject: '', description: '', priority: 'Medium' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      tickets.reload();
    } catch (err) {
      const ex = err as ApiError;
      setErrors({ ...ex.fieldErrors, form: ex.message });
      setCall(ex.call);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        subtitle="We usually respond within one business day"
        actions={
          <button className="btn-secondary" onClick={() => window.open('/popups/support', 'support-portal', 'width=900,height=700')}>
            Open Support Portal
          </button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-5">
        <form className="card space-y-4 p-6 xl:col-span-2" onSubmit={submit} noValidate aria-label="Create support ticket">
          <h2 className="font-semibold">Create a Ticket</h2>
          {errors.form && <Alert kind="error">{errors.form}</Alert>}
          <Field label="Category" htmlFor="tkt-category" error={errors.category} required>
            <select id="tkt-category" className="input" value={form.category} onChange={set('category')}>
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Subject" htmlFor="tkt-subject" error={errors.subject} required>
            <input id="tkt-subject" className="input" value={form.subject} onChange={set('subject')} />
          </Field>
          <Field label="Description" htmlFor="tkt-description" error={errors.description} required hint={`${form.description.length}/1000 characters (min 15)`}>
            <textarea id="tkt-description" rows={4} maxLength={1000} className="input" value={form.description} onChange={set('description')} />
          </Field>
          <fieldset>
            <legend className="label">Priority</legend>
            <div className="flex flex-wrap gap-4">
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="priority" value={p} checked={form.priority === p} onChange={set('priority')} className="accent-brand-600" />
                  {p}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Attachment" htmlFor="tkt-attachment" hint={file ? `${file.name} (${bytes(file.size)})` : 'Optional · PDF, PNG or JPG up to 5 MB'}>
            <input id="tkt-attachment" ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="input file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          {busy && <LoadingOverlay text="Submitting Ticket..." />}
          <button className="btn-primary w-full" disabled={busy} data-testid="ticket-submit">
            {busy && <Spinner />}Submit Ticket
          </button>
          {result && (
            <Alert kind="success" testId="ticket-success">
              Ticket <span className="font-mono font-semibold" data-testid="ticket-id">{result.ticketId}</span> created with status {result.status}. Expected response: {result.expectedResponse}.
            </Alert>
          )}
        </form>
        <section className="card overflow-hidden xl:col-span-3" aria-label="My tickets">
          <h2 className="border-b border-slate-200 px-5 py-4 font-semibold">My Tickets</h2>
          {tickets.loading && !tickets.data ? (
            <TableSkeleton rows={4} cols={5} />
          ) : tickets.error ? (
            <ErrorState error={tickets.error} onRetry={tickets.reload} />
          ) : !tickets.data.data.length ? (
            <EmptyState title="No tickets yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200" data-testid="tickets-table">
                <thead>
                  <tr>
                    {['Ticket ID', 'Subject', 'Category', 'Priority', 'Status', 'Created'].map((h) => (
                      <th scope="col" key={h} className="th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.data.data.map((t: any) => (
                    <tr key={t.ticketId} data-testid="ticket-row">
                      <td className="td font-mono text-xs">{t.ticketId}</td>
                      <td className="td font-medium">
                        {t.subject}
                        {t.attachmentName && <span className="ml-2 text-xs text-slate-500">📎 {t.attachmentName}</span>}
                      </td>
                      <td className="td">{t.category}</td>
                      <td className="td">{t.priority}</td>
                      <td className="td">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="td">{dateTime(t.createdAt)}</td>
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
