import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '../utils/format';
import type { ApiError } from '../services/api';

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  verified: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  scheduled: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  submitted: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  under_review: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  open: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  pending_activation: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  failed: 'bg-red-50 text-red-700 ring-red-600/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  disabled: 'bg-red-50 text-red-700 ring-red-600/20',
  lost: 'bg-red-50 text-red-700 ring-red-600/20',
  locked: 'bg-red-50 text-red-700 ring-red-600/20',
  reversed: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  frozen: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  closed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export function StatusBadge({ status, testId }: { status: string; testId?: string }) {
  const key = status.toLowerCase();
  return (
    <span data-testid={testId} className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', STATUS_STYLES[key] ?? 'bg-slate-100 text-slate-700 ring-slate-500/20')}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'brand' | 'amber' | 'red' | 'violet' | 'sky' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    violet: 'bg-violet-50 text-violet-700',
    sky: 'bg-sky-50 text-sky-700',
  };
  return <span className={cx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)} aria-hidden />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4" data-testid="table-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center" data-testid="empty-state">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl text-slate-400">∅</div>
      <p className="font-semibold text-slate-800">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error | null; onRetry?: () => void }) {
  if (!error) return null;
  const code = (error as ApiError).errorCode;
  const status = (error as ApiError).status;
  return (
    <div role="alert" data-testid="error-state" className="m-4 rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-red-800">Something went wrong</p>
          <p className="mt-1 text-sm text-red-700">{error.message}</p>
          {code && (
            <p className="mt-2 text-xs text-red-600">
              <span className="code">{code}</span> {status ? `HTTP ${status}` : ''}
            </p>
          )}
        </div>
        {onRetry && (
          <button className="btn-secondary btn-sm" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function Alert({ kind = 'info', children, testId }: { kind?: 'info' | 'success' | 'error' | 'warning'; children: ReactNode; testId?: string }) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} data-testid={testId} className={cx('rounded-lg border px-4 py-3 text-sm', styles[kind])}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, testId, accent }: { label: string; value: ReactNode; hint?: ReactNode; testId?: string; accent?: string }) {
  return (
    <div className="card p-5" data-testid={testId}>
      <div className="flex items-center gap-2">
        {accent && <span className={cx('h-2 w-2 rounded-full', accent)} aria-hidden />}
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="tabular mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, testId = 'modal', size = 'md' }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; testId?: string; size?: 'md' | 'lg' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={`${testId}-title`} data-testid={testId} className={cx('max-h-[90vh] w-full overflow-auto rounded-2xl bg-white shadow-2xl', size === 'lg' ? 'max-w-2xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id={`${testId}-title`} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, children, required }: { label: string; htmlFor: string; error?: string; hint?: ReactNode; children: ReactNode; required?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline">
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
        {required && (
          <span className="ml-0.5 text-sm text-red-500" aria-hidden>
            *
          </span>
        )}
      </div>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Pagination({ page, totalPages, total, pageSize, onPage, testId = 'pagination' }: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void; testId?: string }) {
  const pages: Array<number | '…'> = [];
  const windowSize = 5;
  let start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  if (start > 1) pages.push(1, ...(start > 2 ? (['…'] as const) : []));
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages) pages.push(...(end < totalPages - 1 ? (['…'] as const) : []), totalPages);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row" aria-label="Pagination" data-testid={testId}>
      <p className="text-sm text-slate-500" data-testid="pagination-summary">
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong> results
      </p>
      <div className="flex items-center gap-1">
        <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-2 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={cx('min-w-8 rounded-md px-2.5 py-1.5 text-xs font-semibold', p === page ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100')}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          ),
        )}
        <button className="btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: Array<{ id: T; label: string; count?: number }>; value: T; onChange: (t: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          className={cx('-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition', value === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-2 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SortHeader({ label, field, sortBy, order, onSort }: { label: string; field: string; sortBy: string; order: 'asc' | 'desc'; onSort: (f: string) => void }) {
  const active = sortBy === field;
  return (
    <th scope="col" className="th" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className="inline-flex items-center gap-1 uppercase hover:text-slate-800" onClick={() => onSort(field)}>
        {label}
        <span className={cx('text-[10px]', active ? 'text-brand-600' : 'text-slate-300')} aria-hidden>
          {active ? (order === 'asc' ? '▲' : '▼') : '▲▼'}
        </span>
      </button>
    </th>
  );
}

export function LoadingOverlay({ text }: { text: string }) {
  return (
    <div role="status" aria-live="polite" data-testid="loading-indicator" className="flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
      <Spinner />
      {text}
    </div>
  );
}
