import { useState } from 'react';
import type { ApiCall } from '../services/api';
import { cx } from '../utils/format';

/**
 * Developer-style API request/response viewer.
 * Shows exactly what a Playwright `waitForResponse()` would capture.
 */
export function ApiResponsePanel({ call, title = 'API RESPONSE', defaultExpanded = true, showRequest = true }: { call: ApiCall | null; title?: string; defaultExpanded?: boolean; showRequest?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [tab, setTab] = useState<'response' | 'request' | 'headers'>('response');
  const [copied, setCopied] = useState(false);
  if (!call) return null;
  const json = JSON.stringify(call.responseBody, null, 2);
  const ok = call.status >= 200 && call.status < 300;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-slate-200 shadow-lg" data-testid="api-response" aria-label="API response viewer">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-2.5">
        <span className="text-xs font-bold tracking-widest text-slate-400">{title}</span>
        <span className="font-mono text-sm">
          <span className={cx('mr-2 font-bold', call.method === 'GET' ? 'text-sky-400' : call.method === 'DELETE' ? 'text-red-400' : 'text-amber-300')}>{call.method}</span>
          <span data-testid="api-response-url">{call.url}</span>
        </span>
        <span className="ml-auto flex items-center gap-3 text-xs">
          <span data-testid="api-response-status" className={cx('rounded px-2 py-0.5 font-mono font-bold', ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300')}>
            Status: {call.status} {call.statusText}
          </span>
          <span className="font-mono text-slate-400" data-testid="api-response-time">
            Response Time: {call.durationMs} ms
          </span>
        </span>
      </header>
      <div className="flex items-center gap-1 border-b border-slate-800 px-2 py-1.5">
        {(['response', ...(showRequest ? ['request', 'headers'] : [])] as const).map((t) => (
          <button key={t} onClick={() => setTab(t as any)} className={cx('rounded px-2.5 py-1 text-xs font-semibold capitalize', tab === t ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200')}>
            {t === 'response' ? 'Response Body' : t === 'request' ? 'Request' : 'Headers'}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button className="rounded px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800" onClick={copy}>
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <button className="rounded px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800" onClick={() => setExpanded(true)} aria-pressed={expanded}>
            Expand
          </button>
          <button className="rounded px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800" onClick={() => setExpanded(false)} aria-pressed={!expanded}>
            Collapse
          </button>
        </div>
      </div>
      {expanded && (
        <div className="max-h-96 overflow-auto p-4 font-mono text-xs leading-relaxed">
          {tab === 'response' && (
            <pre data-testid="api-response-body" className="whitespace-pre-wrap break-all text-cyan-200">
              {json}
            </pre>
          )}
          {tab === 'request' && (
            <div>
              <p className="mb-2 text-slate-400">REQUEST</p>
              <p className="mb-3">
                {call.method} {call.url}
              </p>
              <p className="mb-1 text-slate-400">Request Body</p>
              <pre data-testid="api-request-body" className="whitespace-pre-wrap break-all text-amber-200">
                {call.requestBody == null ? '(empty)' : JSON.stringify(call.requestBody, null, 2)}
              </pre>
            </div>
          )}
          {tab === 'headers' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-slate-400">Request Headers</p>
                {Object.entries(call.requestHeaders).map(([k, v]) => (
                  <p key={k}>
                    <span className="text-sky-300">{k}</span>: {v}
                  </p>
                ))}
              </div>
              <div>
                <p className="mb-1 text-slate-400">Response Headers</p>
                {Object.entries(call.responseHeaders).map(([k, v]) => (
                  <p key={k}>
                    <span className="text-sky-300">{k}</span>: {v}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
