import { useEffect, useRef, useState } from 'react';
import { useApi, useApiLog } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { api, apiLog, ApiError, type ApiCall } from '../../services/api';
import { ApiResponsePanel } from '../../components/ApiResponsePanel';
import { Alert, EmptyState, ErrorState, Field, LoadingOverlay, PageHeader, StatusBadge, Spinner, TableSkeleton } from '../../components/ui';
import { LabIntro } from './LabBasics';
import { bytes, cx, dateTime, money } from '../../utils/format';

const RUNNER: Array<{ label: string; method: 'GET' | 'POST'; url: string; body?: unknown }> = [
  { label: 'GET /api/accounts', method: 'GET', url: '/api/accounts' },
  { label: 'GET /api/transactions?pageSize=3', method: 'GET', url: '/api/transactions?pageSize=3' },
  { label: 'GET /api/notifications?status=unread', method: 'GET', url: '/api/notifications?status=unread' },
  { label: 'GET /api/cards', method: 'GET', url: '/api/cards' },
  { label: 'GET /api/lab/fx-rates', method: 'GET', url: '/api/lab/fx-rates' },
  { label: 'GET /api/transactions/TXN-000000 (404)', method: 'GET', url: '/api/transactions/TXN-000000' },
  { label: 'POST /api/lab/echo', method: 'POST', url: '/api/lab/echo', body: { purpose: 'api-lab', amount: 125.5, tags: ['playwright', 'api'] } },
  { label: 'POST /api/transfers (invalid OTP → 400)', method: 'POST', url: '/api/transfers', body: { fromAccount: 'CHK-102938', toAccount: 'SAV-827364', amount: 1, otp: '000000' } },
];

// ------------------------------------------------------------------ API Responses
export function ApiLabPage() {
  const calls = useApiLog();
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<ApiCall | null>(null);
  const send = async () => {
    const r = RUNNER[selected];
    setBusy(true);
    try {
      const res = r.method === 'GET' ? await api.get(r.url) : await api.post(r.url, r.body);
      setFocus(res.call);
    } catch (e) {
      setFocus((e as ApiError).call);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <PageHeader title="API Responses" subtitle="A developer-style debug panel showing every request this tab makes" />
      <LabIntro>
        This panel shows what <span className="code">page.waitForResponse()</span> captures: status, headers, body and timing. Compare it to your test’s assertions.
      </LabIntro>
      <section className="card mb-6 p-5" aria-label="Request runner">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-72 flex-1">
            <Field label="Endpoint" htmlFor="runner-endpoint">
              <select id="runner-endpoint" className="input" value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
                {RUNNER.map((r, i) => (
                  <option key={r.label} value={i}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button className="btn-primary" onClick={send} disabled={busy}>
            {busy && <Spinner />}Send Request
          </button>
        </div>
      </section>
      {focus && (
        <div className="mb-6">
          <ApiResponsePanel call={focus} />
        </div>
      )}
      <section className="card overflow-hidden" aria-label="Request log">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">Request Log ({calls.length})</h2>
          <button className="btn-ghost btn-sm" onClick={() => apiLog.clear()}>
            Clear
          </button>
        </div>
        {!calls.length ? (
          <EmptyState title="No requests yet" />
        ) : (
          <table className="min-w-full divide-y divide-slate-200" data-testid="request-log">
            <thead>
              <tr>
                {['Time', 'Method', 'URL', 'Status', 'Duration', ''].map((h) => (
                  <th scope="col" key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calls.map((c) => (
                <tr key={c.id}>
                  <td className="td text-xs">{new Date(c.at).toLocaleTimeString()}</td>
                  <td className="td font-mono text-xs font-bold">{c.method}</td>
                  <td className="td max-w-md truncate font-mono text-xs">{c.url}</td>
                  <td className={cx('td font-mono text-xs font-bold', c.status >= 200 && c.status < 300 ? 'text-emerald-600' : 'text-red-600')}>{c.status || 'ERR'}</td>
                  <td className="td text-xs">{c.durationMs} ms</td>
                  <td className="td">
                    <button className="btn-ghost btn-sm" onClick={() => setFocus(c)}>
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Network interception
const MODES = [
  ['500', '500 Server Error'],
  ['401', '401 Unauthorized'],
  ['403', '403 Forbidden'],
  ['404', '404 Not Found'],
  ['408', '408 Timeout'],
  ['429', '429 Too Many Requests'],
  ['network', 'Network Failure'],
  ['slow', 'Slow Response (8s)'],
  ['invalid-json', 'Invalid JSON'],
];
const DELAYS = [0, 100, 500, 1000, 3000, 5000];

export function NetworkLabPage() {
  const toast = useToast();
  const sim = useApi('/api/lab/simulation');
  const [failure, setFailure] = useState({ mode: '500', endpoint: '/api/accounts', method: 'ANY', times: '' });
  const [delayEndpoint, setDelayEndpoint] = useState('/api/accounts');
  const [delayMs, setDelayMs] = useState(1000);

  const [accounts, setAccounts] = useState<{ loading: boolean; data: any[] | null; error: ApiError | null }>({ loading: false, data: null, error: null });
  const [fx, setFx] = useState<{ loading: boolean; data: any | null; error: ApiError | null }>({ loading: false, data: null, error: null });
  const [echo, setEcho] = useState<any>(null);
  const [lastCall, setLastCall] = useState<ApiCall | null>(null);

  const loadAccounts = async () => {
    setAccounts({ loading: true, data: null, error: null });
    try {
      const r = await api.get('/api/accounts');
      setAccounts({ loading: false, data: r.data.data, error: null });
      setLastCall(r.call);
    } catch (e) {
      setAccounts({ loading: false, data: null, error: e as ApiError });
      setLastCall((e as ApiError).call);
    }
  };
  const loadFx = async () => {
    setFx({ loading: true, data: null, error: null });
    try {
      const r = await api.get('/api/lab/fx-rates');
      setFx({ loading: false, data: r.data, error: null });
      setLastCall(r.call);
    } catch (e) {
      setFx({ loading: false, data: null, error: e as ApiError });
      setLastCall((e as ApiError).call);
    }
  };
  const sendEcho = async () => {
    try {
      const r = await api.post('/api/lab/echo', { source: 'network-lab', amount: 100, currency: 'USD' });
      setEcho(r.data);
      setLastCall(r.call);
    } catch (e) {
      setEcho({ error: (e as ApiError).message });
      setLastCall((e as ApiError).call);
    }
  };

  const save = async (body: unknown) => {
    try {
      const r = await api.post('/api/lab/simulation', body);
      sim.setData(r.data);
      toast('success', 'Simulation saved');
    } catch (e) {
      toast('error', 'Could not save', (e as ApiError).message);
    }
  };
  const clear = async () => {
    await api.del('/api/lab/simulation');
    sim.reload();
    toast('success', 'Simulation cleared');
  };
  const cfg = sim.data?.config;

  return (
    <div>
      <PageHeader title="Network Interception" subtitle="Trigger requests to intercept, mock, block, delay and modify — plus server-side failure injection" />
      <LabIntro>
        Use <span className="code">page.route()</span> to intercept the requests these buttons send. Or let the server misbehave with <strong>Failure Injection</strong> below (stored per browser).
      </LabIntro>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-5" aria-labelledby="acc-h">
          <h2 id="acc-h" className="mb-3 font-semibold">
            GET /api/accounts
          </h2>
          <button className="btn-primary" onClick={loadAccounts} disabled={accounts.loading}>
            Load Accounts
          </button>
          <div className="mt-4" data-testid="network-accounts">
            {accounts.loading && <LoadingOverlay text="Loading accounts..." />}
            {accounts.error && (
              <Alert kind="error" testId="network-accounts-error">
                {accounts.error.message} <span className="code">{accounts.error.errorCode}</span>
              </Alert>
            )}
            {accounts.data && (
              <ul className="divide-y divide-slate-100 text-sm">
                {accounts.data.map((a) => (
                  <li key={a.accountNumber} className="flex justify-between py-2" data-testid="network-account">
                    <span className="font-mono">{a.accountNumber}</span>
                    <span className="tabular font-semibold">{money(a.currentBalance)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="card p-5" aria-labelledby="fx-h">
          <h2 id="fx-h" className="mb-3 font-semibold">
            GET /api/lab/fx-rates
          </h2>
          <button className="btn-primary" onClick={loadFx} disabled={fx.loading}>
            Load FX Rates
          </button>
          <div className="mt-4" data-testid="network-fx">
            {fx.loading && <LoadingOverlay text="Fetching exchange rates..." />}
            {fx.error && (
              <Alert kind="error" testId="network-fx-error">
                {fx.error.message}
              </Alert>
            )}
            {fx.data && (
              <>
                <p className="text-xs text-slate-500">
                  Quote <span className="font-mono" data-testid="fx-quote-id">{fx.data.quoteId}</span>
                </p>
                <table className="mt-2 w-full text-sm" data-testid="fx-table">
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(fx.data.rates).map(([k, v]) => (
                      <tr key={k}>
                        <td className="py-1.5 font-semibold">USD → {k}</td>
                        <td className="tabular py-1.5 text-right" data-testid={`fx-${k}`}>
                          {String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </section>

        <section className="card p-5" aria-labelledby="echo-h">
          <h2 id="echo-h" className="mb-3 font-semibold">
            POST /api/lab/echo
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Sends <span className="code">{'{ source, amount: 100, currency }'}</span>. Modify it with <span className="code">route.continue({'{ postData }'})</span>.
          </p>
          <button className="btn-primary" onClick={sendEcho}>
            Send Echo Request
          </button>
          {echo && (
            <pre className="mt-4 max-h-56 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-cyan-200" data-testid="echo-result">
              {JSON.stringify(echo.body ?? echo, null, 2)}
            </pre>
          )}
          {echo?.headers?.['x-test-run'] && (
            <p className="mt-2 text-xs" data-testid="echo-custom-header">
              x-test-run: {echo.headers['x-test-run']}
            </p>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="fail-h">
          <h2 id="fail-h" className="font-semibold">
            Failure Injection
          </h2>
          <p className="mb-4 text-sm text-slate-500">The server will fail matching requests from this browser.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Failure Mode" htmlFor="fail-mode">
              <select id="fail-mode" className="input" value={failure.mode} onChange={(e) => setFailure((f) => ({ ...f, mode: e.target.value }))}>
                {MODES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Endpoint" htmlFor="fail-endpoint">
              <select id="fail-endpoint" className="input" value={failure.endpoint} onChange={(e) => setFailure((f) => ({ ...f, endpoint: e.target.value }))}>
                {(sim.data?.endpoints ?? ['*', '/api/accounts']).map((ep: string) => (
                  <option key={ep} value={ep}>
                    {ep === '*' ? 'All endpoints' : ep}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="HTTP Method" htmlFor="fail-method">
              <select id="fail-method" className="input" value={failure.method} onChange={(e) => setFailure((f) => ({ ...f, method: e.target.value }))}>
                {['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Fail next N requests" htmlFor="fail-times" hint="Empty = until cleared">
              <input id="fail-times" type="number" min={1} className="input" value={failure.times} onChange={(e) => setFailure((f) => ({ ...f, times: e.target.value }))} />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-danger" onClick={() => save({ failure: { ...failure, times: failure.times || null } })}>
              Enable Failure
            </button>
            <button className="btn-secondary" onClick={clear}>
              Clear All Simulations
            </button>
          </div>
        </section>

        <section className="card p-5" aria-labelledby="delay-h">
          <h2 id="delay-h" className="font-semibold">
            Network Delay
          </h2>
          <p className="mb-4 text-sm text-slate-500">Add server-side latency to an endpoint.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Delayed Endpoint" htmlFor="delay-endpoint">
              <select id="delay-endpoint" className="input" value={delayEndpoint} onChange={(e) => setDelayEndpoint(e.target.value)}>
                {(sim.data?.endpoints ?? ['*', '/api/accounts']).map((ep: string) => (
                  <option key={ep} value={ep}>
                    {ep === '*' ? 'All endpoints' : ep}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Delay" htmlFor="delay-ms">
              <select id="delay-ms" className="input" value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))}>
                {DELAYS.map((d) => (
                  <option key={d} value={d}>
                    {d === 0 ? 'None' : d >= 1000 ? `${d / 1000} second${d > 1000 ? 's' : ''}` : `${d} ms`}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button className="btn-primary mt-4" onClick={() => save({ delays: { ...(cfg?.delays ?? {}), [delayEndpoint]: delayMs } })}>
            Apply Delay
          </button>
          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs" data-testid="simulation-config">
            <p className="font-semibold text-slate-700">Active configuration</p>
            {sim.loading ? (
              <p>Loading…</p>
            ) : !cfg?.failure && !Object.keys(cfg?.delays ?? {}).length ? (
              <p className="text-slate-500">No simulations active</p>
            ) : (
              <>
                {cfg?.failure && (
                  <p>
                    Failure: <strong>{cfg.failure.mode}</strong> on {cfg.failure.method} {cfg.failure.endpoint}
                    {cfg.failure.times ? ` (next ${cfg.failure.times})` : ''}
                  </p>
                )}
                {Object.entries(cfg?.delays ?? {}).map(([k, v]) => (
                  <p key={k}>
                    Delay: {k} +{String(v)} ms
                  </p>
                ))}
              </>
            )}
          </div>
        </section>
      </div>
      {lastCall && (
        <div className="mt-6">
          <ApiResponsePanel call={lastCall} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ File upload
const DOC_TYPES = ['KYC Document', 'Address Proof', 'Income Proof'];

export function UploadLabPage() {
  const docs = useApi('/api/documents');
  const [call, setCall] = useState<ApiCall | null>(null);
  return (
    <div>
      <PageHeader title="File Upload" subtitle="Upload banking documents — PDF, PNG or JPG up to 5 MB" />
      <LabIntro>
        Use <span className="code">{"page.getByLabel('Upload KYC Document').setInputFiles('sample-files/kyc-document.pdf')"}</span>. Sample files:{' '}
        {['kyc-document.pdf', 'address-proof.png', 'income-proof.jpg', 'invalid-file.txt'].map((f, i) => (
          <span key={f}>
            {i > 0 && ', '}
            <a className="underline" href={`/sample-files/${f}`} download>
              {f}
            </a>
          </span>
        ))}
      </LabIntro>
      <div className="grid gap-6 lg:grid-cols-3">
        {DOC_TYPES.map((t) => (
          <UploadCard
            key={t}
            category={t}
            onDone={(c) => {
              setCall(c);
              docs.reload();
            }}
          />
        ))}
      </div>
      <section className="card mt-6 overflow-hidden" aria-label="Uploaded documents">
        <h2 className="border-b border-slate-200 px-5 py-4 font-semibold">Uploaded Documents</h2>
        {docs.loading && !docs.data ? (
          <TableSkeleton rows={3} cols={5} />
        ) : docs.error ? (
          <ErrorState error={docs.error} onRetry={docs.reload} />
        ) : !docs.data.data.length ? (
          <EmptyState title="No documents uploaded yet" />
        ) : (
          <table className="min-w-full divide-y divide-slate-200" data-testid="documents-table">
            <thead>
              <tr>
                {['Document ID', 'Category', 'File Name', 'File Size', 'Upload Status', 'Uploaded', ''].map((h) => (
                  <th scope="col" key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.data.data.map((d: any) => (
                <tr key={d.documentId} data-testid="document-row">
                  <td className="td font-mono text-xs">{d.documentId}</td>
                  <td className="td">{d.category}</td>
                  <td className="td font-medium">{d.fileName}</td>
                  <td className="td">{bytes(d.fileSize)}</td>
                  <td className="td">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="td">{dateTime(d.uploadedAt)}</td>
                  <td className="td">
                    <button
                      className="btn-ghost btn-sm text-red-600"
                      onClick={async () => {
                        if (!window.confirm(`Delete ${d.fileName}?`)) return;
                        const r = await api.del(`/api/documents/${d.documentId}`);
                        setCall(r.call);
                        docs.reload();
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {call && (
        <div className="mt-6">
          <ApiResponsePanel call={call} />
        </div>
      )}
    </div>
  );
}

function UploadCard({ category, onDone }: { category: string; onDone: (c: ApiCall) => void }) {
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<{ status: 'idle' | 'uploading' | 'done' | 'error'; message?: string }>({ status: 'idle' });
  const id = `upload-${category.toLowerCase().replace(/\s+/g, '-')}`;
  const upload = async () => {
    if (!file) {
      setState({ status: 'error', message: 'Please choose a file first' });
      return;
    }
    setState({ status: 'uploading' });
    const fd = new FormData();
    fd.append('category', category);
    fd.append('file', file);
    try {
      const r = await api.post('/api/documents', fd);
      setState({ status: 'done', message: `${r.data.fileName} uploaded · ${r.data.status}` });
      toast('success', 'Upload complete', r.data.fileName);
      setFile(null);
      if (ref.current) ref.current.value = '';
      onDone(r.call);
    } catch (e) {
      setState({ status: 'error', message: (e as ApiError).message });
      onDone((e as ApiError).call);
    }
  };
  return (
    <section className="card p-5" aria-label={category} data-testid={id}>
      <h2 className="font-semibold">{category}</h2>
      <label htmlFor={id} className="mt-3 block text-sm font-medium text-slate-700">
        Upload {category}
      </label>
      <input
        id={id}
        ref={ref}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="input mt-1 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setState({ status: 'idle' });
        }}
      />
      {file && (
        <dl className="mt-3 grid grid-cols-2 gap-1 text-xs" data-testid="selected-file">
          <dt className="text-slate-500">File name</dt>
          <dd className="font-medium">{file.name}</dd>
          <dt className="text-slate-500">File size</dt>
          <dd>{bytes(file.size)}</dd>
          <dt className="text-slate-500">Type</dt>
          <dd>{file.type || 'unknown'}</dd>
        </dl>
      )}
      <button className="btn-primary mt-4 w-full" onClick={upload} disabled={state.status === 'uploading'}>
        {state.status === 'uploading' && <Spinner />}
        {state.status === 'uploading' ? 'Uploading...' : 'Upload'}
      </button>
      {state.message && (
        <p role={state.status === 'error' ? 'alert' : 'status'} data-testid="upload-status" className={cx('mt-3 text-sm font-medium', state.status === 'error' ? 'text-red-600' : 'text-emerald-700')}>
          {state.message}
        </p>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ File download
export function DownloadLabPage() {
  const accounts = useApi('/api/accounts');
  const loans = useApi('/api/loans');
  const [account, setAccount] = useState('');
  const [loan, setLoan] = useState('');
  useEffect(() => {
    if (!account && accounts.data?.data[0]) setAccount(accounts.data.data[0].accountNumber);
  }, [accounts.data, account]);
  useEffect(() => {
    if (!loan && loans.data?.data[0]) setLoan(loans.data.data[0].applicationId);
  }, [loans.data, loan]);
  return (
    <div>
      <PageHeader title="File Download" subtitle="Server-generated statements, reports and agreements" />
      <LabIntro>
        <span className="code">{"const download = page.waitForEvent('download');"}</span> → click → <span className="code">download.suggestedFilename()</span>, <span className="code">download.path()</span>
      </LabIntro>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5" aria-label="Account statement">
          <h2 className="font-semibold">Account Statement</h2>
          <div className="mt-3">
            <Field label="Statement Account" htmlFor="dl-account">
              <select id="dl-account" className="input" value={account} onChange={(e) => setAccount(e.target.value)}>
                {accounts.data?.data.map((a: any) => (
                  <option key={a.accountNumber}>{a.accountNumber}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <a className="btn-primary" href={`/api/downloads/statement?accountId=${account}`}>
              Download Account Statement
            </a>
            <a className="btn-secondary" href={`/api/downloads/statement?accountId=${account}&format=csv`}>
              Download Statement (CSV)
            </a>
          </div>
        </section>
        <section className="card p-5" aria-label="Transaction report">
          <h2 className="font-semibold">Transaction Report</h2>
          <p className="mt-1 text-sm text-slate-500">CSV of all your transactions.</p>
          <div className="mt-4 flex flex-col gap-2">
            <a className="btn-primary" href="/api/downloads/transactions-report">
              Download Transaction Report
            </a>
            <a className="btn-secondary" href="/api/downloads/transactions-report?status=Failed">
              Download Failed Transactions
            </a>
          </div>
        </section>
        <section className="card p-5" aria-label="Loan agreement">
          <h2 className="font-semibold">Loan Agreement</h2>
          <div className="mt-3">
            <Field label="Loan Application" htmlFor="dl-loan">
              <select id="dl-loan" className="input" value={loan} onChange={(e) => setLoan(e.target.value)}>
                {loans.data?.data.map((l: any) => (
                  <option key={l.applicationId} value={l.applicationId}>
                    {l.applicationId} — {l.loanType}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <a className="btn-primary mt-4 w-full" href={`/api/downloads/loan-agreement/${loan}`}>
            Download Loan Agreement
          </a>
        </section>
      </div>
    </div>
  );
}
