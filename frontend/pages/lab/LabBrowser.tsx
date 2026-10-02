import { useEffect, useState } from 'react';
import { usePaymentMessages, useBeforeUnload } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { api, ApiError, type ApiCall } from '../../services/api';
import { ApiResponsePanel } from '../../components/ApiResponsePanel';
import { Alert, Field, PageHeader } from '../../components/ui';
import { LabIntro } from './LabBasics';
import { money } from '../../utils/format';

function Scenario({ n, title, level, children, code }: { n: number; title: string; level: string; children: React.ReactNode; code?: string }) {
  return (
    <section className="card overflow-hidden" aria-labelledby={`scenario-${n}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
        <span className="rounded bg-navy-900 px-2 py-0.5 text-xs font-bold text-white">Scenario {n}</span>
        <h2 id={`scenario-${n}`} className="font-semibold text-slate-900">
          {title}
        </h2>
        <span className="ml-auto text-xs font-semibold uppercase text-slate-400">{level}</span>
      </div>
      <div className="p-5">
        {children}
        {code && <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-cyan-200">{code}</pre>}
      </div>
    </section>
  );
}

function messageToCall(msg: any): ApiCall {
  return {
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
  };
}

// ------------------------------------------------------------------ iFrames
export function IframesLabPage() {
  const [frameMsg, setFrameMsg] = useState<string | null>(null);
  const [gatewayCall, setGatewayCall] = useState<ApiCall | null>(null);
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data?.type === 'parabank:card-frame') setFrameMsg(`Parent received authorization ${e.data.authorization} for card ending ${e.data.last4}`);
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, []);
  usePaymentMessages((m) => setGatewayCall(messageToCall(m)));

  return (
    <div>
      <PageHeader title="iFrames Lab" subtitle="Real <iframe> elements — by test id, by name, by URL, and nested" />
      <LabIntro>
        Elements inside a frame are invisible to <span className="code">page.getBy…()</span>. Use <span className="code">page.frameLocator()</span> or <span className="code">page.frame()</span>.
      </LabIntro>
      <div className="grid gap-6 xl:grid-cols-2">
        <Scenario n={1} title="Secure Payment Gateway (data-testid)" level="Intermediate" code={`const frame = page.frameLocator('[data-testid="payment-frame"]');\nawait frame.getByLabel('Card Number').fill('4111111111111111');`}>
          <div className="frame-label mb-1 text-xs font-bold uppercase text-slate-500">iframe · data-testid="payment-frame"</div>
          <iframe src="/lab-pages/secure-card" data-testid="payment-frame" title="Secure Payment Gateway" className="h-[490px] w-full rounded-lg border-2 border-dashed border-slate-300" />
          {frameMsg && (
            <p className="mt-2 text-sm text-brand-700" role="status" data-testid="parent-frame-message">
              {frameMsg}
            </p>
          )}
        </Scenario>

        <Scenario n={2} title="Named iFrame (bank-payment-frame)" level="Intermediate" code={`const frame = page.frame({ name: 'bank-payment-frame' });\nawait frame!.getByLabel('Beneficiary Name').fill('Alice');`}>
          <div className="mb-1 text-xs font-bold uppercase text-slate-500">iframe · name="bank-payment-frame"</div>
          <iframe src="/lab-pages/transfer-widget" name="bank-payment-frame" title="Quick transfer widget" className="h-[490px] w-full rounded-lg border-2 border-dashed border-slate-300" />
        </Scenario>

        <Scenario n={3} title="URL-based iFrame (/payment-gateway)" level="Intermediate" code={`const frame = page.frame({ url: /\\/payment-gateway\\?mode=simple/ });\nawait frame!.getByLabel('Card Number').fill('4111 1111 1111 1111');`}>
          <p className="mb-2 text-sm text-slate-600">
            A real gateway: <strong>Pay Now</strong> calls <span className="code">POST /api/payments</span> (amount ≤ $100 → no OTP).
          </p>
          <div className="mb-1 text-xs font-bold uppercase text-slate-500">iframe · src="/payment-gateway?mode=simple"</div>
          <iframe src="/payment-gateway?mode=simple&amount=49.99&merchant=Lab%20Coffee%20Shop" title="Payment gateway (URL)" className="h-[560px] w-full rounded-lg border-2 border-dashed border-slate-300" />
        </Scenario>

        <Scenario
          n={4}
          title="Nested iFrames: Card → OTP"
          level="Advanced"
          code={`const pay = page.frameLocator('[data-testid="nested-payment-frame"]');\nawait pay.getByLabel('Card Number').fill('4111 1111 1111 1111');\n// ...\nconst otp = pay.frameLocator('[data-testid="otp-frame"]');\nawait otp.getByLabel('Enter OTP').fill('123456');`}
        >
          <p className="mb-2 text-sm text-slate-600">Main page → Payment iframe → OTP iframe → OTP input. Verifying the OTP raises a real <span className="code">confirm()</span>.</p>
          <div className="mb-1 text-xs font-bold uppercase text-slate-500">iframe · data-testid="nested-payment-frame"</div>
          <iframe src="/payment-gateway?mode=otp&amount=180&merchant=Nested%20Frame%20Electronics" data-testid="nested-payment-frame" title="Payment with OTP" className="h-[760px] w-full rounded-lg border-2 border-dashed border-slate-300" />
        </Scenario>

        <Scenario n={5} title="Two-level frame tree" level="Advanced" code={`const l1 = page.frameLocator('[data-testid="level-1-frame"]');\nconst l2 = l1.frameLocator('[data-testid="level-2-frame"]');\nawait l2.getByLabel('Appointment Date').fill('2026-12-01');`}>
          <div className="mb-1 text-xs font-bold uppercase text-slate-500">iframe · data-testid="level-1-frame"</div>
          <iframe src="/lab-pages/outer-frame" data-testid="level-1-frame" title="Level 1 frame" className="h-[380px] w-full rounded-lg border-2 border-dashed border-slate-300" />
        </Scenario>
      </div>
      {gatewayCall && (
        <div className="mt-6">
          <ApiResponsePanel call={gatewayCall} title="GATEWAY API RESPONSE (relayed via postMessage)" />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Dialogs
export function DialogsLabPage() {
  const toast = useToast();
  const [result, setResult] = useState<string>('No dialog handled yet');
  const [call, setCall] = useState<ApiCall | null>(null);
  const [transfer, setTransfer] = useState({ to: '', amount: '' });
  const dirty = transfer.to !== '' || transfer.amount !== '';
  useBeforeUnload(dirty);

  const simple = () => {
    window.alert('Welcome to the ParaBank Pro Automation Lab');
    setResult('Simple alert acknowledged');
  };
  const txAlert = () => {
    window.alert('Transaction submitted successfully');
    setResult('Transaction alert acknowledged');
  };
  const secAlert = () => {
    window.alert('Security Alert: A new login was detected from Chrome on Windows. If this was not you, change your password immediately.');
    setResult('Security alert acknowledged');
  };
  const confirmDelete = () => {
    const ok = window.confirm('Are you sure you want to delete this beneficiary?\nBeneficiary: Robert Smith (Chase Bank ••••4321)');
    setResult(ok ? 'Beneficiary Robert Smith deleted' : 'Deletion cancelled');
  };
  const promptRef = () => {
    const value = window.prompt('Enter transaction reference', 'TXN-REF-0001');
    setResult(value === null ? 'Prompt cancelled' : value.trim() === '' ? 'Reference cannot be empty' : `Reference saved: ${value}`);
  };
  const promptLookup = async () => {
    const id = window.prompt('Enter a transaction ID to look up (e.g. TXN-123456)');
    if (id === null) {
      setResult('Lookup cancelled');
      return;
    }
    try {
      const res = await api.get(`/api/transactions/${encodeURIComponent(id.trim())}`);
      setCall(res.call);
      setResult(`Found ${res.data.data.transactionId}: ${res.data.data.description} (${money(res.data.data.amount)})`);
    } catch (e) {
      setCall((e as ApiError).call);
      setResult(`Lookup failed: ${(e as ApiError).message}`);
    }
  };
  const confirmApi = async () => {
    const { data } = await api.get('/api/notifications');
    const latest = data.data[0];
    if (!latest) {
      setResult('No notifications to delete');
      return;
    }
    if (!window.confirm(`Delete notification "${latest.title}"?`)) {
      setResult('Notification kept');
      return;
    }
    try {
      const res = await api.del(`/api/notifications/${latest.id}`);
      setCall(res.call);
      setResult(`Deleted notification ${latest.id}`);
      toast('success', 'Notification deleted');
    } catch (e) {
      setCall((e as ApiError).call);
      setResult(`Delete failed: ${(e as ApiError).message}`);
    }
  };

  return (
    <div>
      <PageHeader title="Alerts & Dialogs" subtitle="Real alert(), confirm(), prompt() and beforeunload dialogs" />
      <LabIntro>
        Playwright auto-dismisses dialogs unless you register <span className="code">{"page.on('dialog', ...)"}</span> or <span className="code">{"page.once('dialog', ...)"}</span> <em>before</em> the click.
      </LabIntro>
      <div className="mb-6">
        <Alert kind="info" testId="dialog-result">
          {result}
        </Alert>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="alerts-h">
          <h2 id="alerts-h" className="mb-3 font-semibold">
            JavaScript Alerts
          </h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={simple}>
              Simple Alert
            </button>
            <button className="btn-secondary" onClick={txAlert}>
              Transaction Alert
            </button>
            <button className="btn-secondary" onClick={secAlert}>
              Security Alert
            </button>
          </div>
        </section>
        <section className="card p-5" aria-labelledby="confirm-h">
          <h2 id="confirm-h" className="mb-3 font-semibold">
            Confirm Dialogs
          </h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={confirmDelete}>
              Delete Beneficiary
            </button>
            <button className="btn-secondary" onClick={confirmApi}>
              Delete Latest Notification (API)
            </button>
          </div>
        </section>
        <section className="card p-5" aria-labelledby="prompt-h">
          <h2 id="prompt-h" className="mb-3 font-semibold">
            Prompt Dialogs
          </h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={promptRef}>
              Enter Transaction Reference
            </button>
            <button className="btn-secondary" onClick={promptLookup}>
              Look Up Transaction (API)
            </button>
          </div>
        </section>
        <section className="card p-5" aria-labelledby="unload-h">
          <h2 id="unload-h" className="mb-1 font-semibold">
            Unsaved Transfer (beforeunload)
          </h2>
          <p className="mb-3 text-sm text-slate-500">Type anything below, then reload or follow the full-page link. The browser shows a real beforeunload dialog.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Recipient" htmlFor="unsaved-to">
              <input id="unsaved-to" className="input" value={transfer.to} onChange={(e) => setTransfer((t) => ({ ...t, to: e.target.value }))} />
            </Field>
            <Field label="Transfer Amount" htmlFor="unsaved-amount">
              <input id="unsaved-amount" type="number" className="input" value={transfer.amount} onChange={(e) => setTransfer((t) => ({ ...t, amount: e.target.value }))} />
            </Field>
          </div>
          <p className="mt-2 text-xs" data-testid="unsaved-state">
            {dirty ? '⚠ Unsaved changes' : 'No unsaved changes'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => window.location.reload()}>
              Reload Page
            </button>
            <a className="btn-secondary" href="/dashboard">
              Leave to Dashboard (full page load)
            </a>
            <button className="btn-ghost" onClick={() => setTransfer({ to: '', amount: '' })}>
              Discard Changes
            </button>
          </div>
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

// ------------------------------------------------------------------ Popups & Windows
export function PopupsLabPage() {
  const [opened, setOpened] = useState<string[]>([]);
  const open = (url: string, name: string, label: string, features = 'width=900,height=720') => {
    const w = window.open(url, name, features);
    setOpened((o) => [`${label} → ${w ? 'opened' : 'blocked by browser'}`, ...o].slice(0, 6));
  };
  return (
    <div>
      <PageHeader title="Popups & Windows" subtitle="Every button calls the real window.open()" />
      <LabIntro>
        Start waiting <em>before</em> clicking: <span className="code">{"const popupPromise = page.waitForEvent('popup');"}</span>
      </LabIntro>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="windows-h">
          <h2 id="windows-h" className="mb-3 font-semibold">
            Banking Windows
          </h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => open('/popups/statement', 'account-statement', 'Account Statement')}>
              Open Account Statement
            </button>
            <button className="btn-secondary" onClick={() => open('/popups/policy', 'bank-policy', 'Bank Policy')}>
              Open Bank Policy
            </button>
            <button className="btn-secondary" onClick={() => open('/popups/secure-login', 'secure-banking', 'Secure Banking Portal', 'width=760,height=720')}>
              Open Secure Banking Portal
            </button>
            <button className="btn-secondary" onClick={() => open('/popups/transaction', 'transaction-details', 'Transaction Details', 'width=720,height=640')}>
              Open Transaction Details
            </button>
            <button className="btn-secondary" onClick={() => open('/popups/support', 'support-portal', 'Support Portal')}>
              Open Support Portal
            </button>
          </div>
        </section>
        <section className="card p-5" aria-labelledby="multi-h">
          <h2 id="multi-h" className="mb-3 font-semibold">
            Multiple Windows
          </h2>
          <p className="mb-3 text-sm text-slate-500">Opens Account Statement, Bank Policy and Support Portal at once. Identify each by URL and title.</p>
          <button
            className="btn-primary"
            onClick={() => {
              open('/popups/statement', 'multi-statement', 'Account Statement');
              open('/popups/policy', 'multi-policy', 'Bank Policy');
              open('/popups/support', 'multi-support', 'Support Portal');
            }}
          >
            Open All Windows
          </button>
          <p className="mt-4 text-sm">
            Or follow a link with <span className="code">target="_blank"</span>:{' '}
            <a href="/popups/policy" target="_blank" rel="noopener" className="font-semibold text-brand-700 underline">
              Read the Bank Policy
            </a>
          </p>
        </section>
      </div>
      <section className="card mt-6 p-5" aria-label="Window log">
        <h2 className="mb-2 font-semibold">Window Log</h2>
        {opened.length ? (
          <ul className="space-y-1 text-sm" data-testid="window-log">
            {opened.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No windows opened yet.</p>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Tabs
export function TabsLabPage() {
  return (
    <div>
      <PageHeader title="Multiple Tabs" subtitle="Open banking pages in new tabs and switch between them" />
      <LabIntro>
        New tabs share the browser context (and cookies), so they are already logged in. Use <span className="code">context.waitForEvent('page')</span> and <span className="code">context.pages()</span>.
      </LabIntro>
      <section className="card p-5">
        <div className="flex flex-wrap gap-2">
          <a className="btn-secondary" href="/dashboard" target="_blank" rel="noopener">
            Open Dashboard
          </a>
          <a className="btn-secondary" href="/transactions" target="_blank" rel="noopener">
            Open Transactions
          </a>
          <a className="btn-secondary" href="/support" target="_blank" rel="noopener">
            Open Support
          </a>
          <button className="btn-primary" onClick={() => ['/dashboard', '/transactions', '/support'].forEach((u) => window.open(u, '_blank'))}>
            Open All Three Tabs
          </button>
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Advanced workflows
export function WorkflowsLabPage() {
  const toast = useToast();
  const [gatewayCall, setGatewayCall] = useState<ApiCall | null>(null);
  const [call, setCall] = useState<ApiCall | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  usePaymentMessages((m) => {
    setGatewayCall(messageToCall(m));
    if (m.ok) toast('success', 'Payment Successful', `${m.body.paymentId} · ${money(m.body.amount)}`);
    else toast('error', 'Payment Failed', m.body?.message);
  });

  const payWithConfirm = async () => {
    const amount = (Math.floor(Math.random() * 9000) + 1000) / 100;
    if (!window.confirm(`Pay your Internet bill of ${money(amount)} now?`)) {
      setStatus('Bill payment cancelled');
      return;
    }
    try {
      const accounts = await api.get('/api/accounts');
      const chk = accounts.data.data.find((a: any) => a.accountType === 'CHECKING');
      const res = await api.post('/api/payments', { biller: 'Internet', customerNumber: 'INT556677', amount, accountId: chk.accountNumber });
      setCall(res.call);
      setStatus(`Bill paid: ${res.data.paymentId}`);
      toast('success', 'Bill paid', res.data.paymentId);
    } catch (e) {
      setCall((e as ApiError).call);
      setStatus(`Payment failed: ${(e as ApiError).message}`);
    }
  };

  return (
    <div>
      <PageHeader title="Advanced Workflows" subtitle="Expert-level flows combining popups, iframes, dialogs and APIs" />
      <LabIntro>
        The full Challenge #105 flow starts on <a href="/transfers" className="font-semibold underline">Transfers</a>. These shortcuts let you practice each combination in isolation.
      </LabIntro>
      {status && (
        <div className="mb-6">
          <Alert kind="info" testId="workflow-status">
            {status}
          </Alert>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Scenario n={1} title="Popup + iFrame + Nested OTP + Dialog + API" level="Expert">
          <p className="mb-3 text-sm text-slate-600">Main page → popup → payment iframe → card form → OTP iframe → confirm() → POST /api/payments → JSON → result relayed back here.</p>
          <button
            className="btn-primary"
            onClick={() => window.open('/payment-gateway/checkout?amount=320.75&merchant=Workflow%20Travel%20Agency&ref=WF-' + Math.floor(Math.random() * 1e6), 'secure-payment-gateway', 'width=620,height=900')}
          >
            Open Payment Gateway
          </button>
        </Scenario>
        <Scenario n={2} title="Dialog + API" level="Expert">
          <p className="mb-3 text-sm text-slate-600">A confirm() decides whether POST /api/payments is sent at all.</p>
          <button className="btn-primary" onClick={payWithConfirm}>
            Pay Internet Bill
          </button>
        </Scenario>
      </div>
      <div className="mt-6 space-y-4">
        {gatewayCall && <ApiResponsePanel call={gatewayCall} title="GATEWAY API RESPONSE" />}
        {call && <ApiResponsePanel call={call} />}
      </div>
    </div>
  );
}
