export const money = (n: number | null | undefined, currency = 'USD') =>
  n == null || Number.isNaN(n)
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);

export const signedMoney = (n: number) => (n < 0 ? `-${money(Math.abs(n))}` : `+${money(n)}`);

export const date = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';

export const dateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export const isoDay = (d = new Date()) => d.toISOString().slice(0, 10);

export const titleCase = (s: string) => s.toLowerCase().replace(/(^|[_\s])(\w)/g, (_m, sp, c) => (sp ? ' ' : '') + c.toUpperCase());

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const bytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`);

export const ACCOUNT_LABEL: Record<string, string> = { CHECKING: 'Checking', SAVINGS: 'Savings', CREDIT: 'Credit' };
