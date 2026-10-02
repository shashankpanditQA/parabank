import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { ErrorState, PageHeader, TableSkeleton } from '../components/ui';
import { cx } from '../utils/format';

const METHOD_STYLE: Record<string, string> = {
  GET: 'bg-sky-100 text-sky-800',
  POST: 'bg-emerald-100 text-emerald-800',
  PUT: 'bg-amber-100 text-amber-800',
  PATCH: 'bg-violet-100 text-violet-800',
  DELETE: 'bg-red-100 text-red-800',
  ALL: 'bg-slate-200 text-slate-800',
};

export function ApiDocsPage() {
  const { data, loading, error, reload } = useApi('/api/docs');
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<string | null>('POST /api/transfers');
  const groups = useMemo(() => {
    const out = new Map<string, any[]>();
    for (const e of data?.endpoints ?? []) {
      if (filter && !`${e.method} ${e.path} ${e.description}`.toLowerCase().includes(filter.toLowerCase())) continue;
      if (!out.has(e.group)) out.set(e.group, []);
      out.get(e.group)!.push(e);
    }
    return out;
  }, [data, filter]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div>
      <PageHeader
        title="API Documentation"
        subtitle={
          <>
            {data?.count ?? '…'} REST endpoints. Authenticate with the <span className="code">pb_session</span> cookie or <span className="code">Authorization: Bearer &lt;sessionId&gt;</span>.
          </>
        }
        actions={
          <a className="btn-secondary" href="/api/docs" target="_blank" rel="noreferrer">
            Raw JSON
          </a>
        }
      />
      <div className="card mb-4 p-4">
        <label htmlFor="docs-filter" className="label">
          Filter endpoints
        </label>
        <input id="docs-filter" className="input max-w-md" placeholder="e.g. transfers, POST, beneficiary" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <p className="mt-3 text-xs text-slate-500">
          Every endpoint also accepts <span className="code">x-simulate-failure: 500|401|403|404|408|429|network|invalid-json</span> and <span className="code">x-simulate-delay: 3000</span> headers (or <span className="code">?__fail=</span> / <span className="code">?__delay=</span>) to practice error handling.
        </p>
      </div>
      {loading ? (
        <TableSkeleton rows={8} cols={3} />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([group, endpoints]) => (
            <section key={group} aria-label={group}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{group}</h2>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {endpoints.map((e) => {
                  const key = `${e.method} ${e.path}`;
                  const isOpen = open === key;
                  return (
                    <div key={key} data-testid="api-endpoint">
                      <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : key)}>
                        <span className={cx('w-16 rounded px-2 py-0.5 text-center font-mono text-xs font-bold', METHOD_STYLE[e.method])}>{e.method}</span>
                        <span className="font-mono text-sm font-semibold text-slate-800">{e.path}</span>
                        <span className="ml-auto hidden truncate text-sm text-slate-500 md:block">{e.description}</span>
                      </button>
                      {isOpen && (
                        <div className="grid gap-4 bg-slate-50 px-4 py-4 lg:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">Description</p>
                            <p className="mt-1 text-sm">{e.description}</p>
                            <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Auth</p>
                            <p className="mt-1 text-sm">{e.auth}</p>
                            <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Status Codes</p>
                            <ul className="mt-1 space-y-1 text-sm">
                              {e.statusCodes.map(([code, text]: [number, string]) => (
                                <li key={code + text}>
                                  <span className={cx('mr-2 rounded px-1.5 font-mono text-xs font-bold', code < 300 ? 'bg-emerald-100 text-emerald-800' : code < 500 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800')}>{code}</span>
                                  {text}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">Request</p>
                            <pre className="mt-1 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-amber-200">{e.request === undefined ? '(no body)' : typeof e.request === 'string' ? e.request : JSON.stringify(e.request, null, 2)}</pre>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">Response</p>
                            <pre className="mt-1 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-cyan-200">{typeof e.response === 'string' ? e.response : JSON.stringify(e.response, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
