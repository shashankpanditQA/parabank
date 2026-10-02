/**
 * API client used by every page.
 * - Every call goes through `fetch()` to the real backend.
 * - Each call is recorded in the API log so the API Response Viewer can show
 *   the exact request/response that a Playwright test would see.
 */
export interface ApiCall {
  id: number;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  status: number;
  statusText: string;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  durationMs: number;
  at: string;
  ok: boolean;
}

type Listener = () => void;
let calls: ApiCall[] = [];
const listeners = new Set<Listener>();
let seq = 0;

export const apiLog = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot: () => calls,
  push(call: ApiCall) {
    calls = [call, ...calls].slice(0, 50);
    listeners.forEach((l) => l());
  },
  clear() {
    calls = [];
    listeners.forEach((l) => l());
  },
};

export class ApiError extends Error {
  status: number;
  errorCode: string;
  body: any;
  call: ApiCall;
  constructor(status: number, body: any, call: ApiCall) {
    super(body?.message || `Request failed with status ${status}`);
    this.status = status;
    this.errorCode = body?.errorCode || (status === 0 ? 'NETWORK_ERROR' : `HTTP_${status}`);
    this.body = body;
    this.call = call;
  }
  get fieldErrors(): Record<string, string> {
    return this.body?.fieldErrors ?? {};
  }
}

export interface ApiResult<T> {
  data: T;
  call: ApiCall;
}

const STATUS_TEXT: Record<number, string> = {
  200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden',
  404: 'Not Found', 408: 'Request Timeout', 409: 'Conflict', 413: 'Payload Too Large', 415: 'Unsupported Media Type',
  422: 'Unprocessable Entity', 423: 'Locked', 429: 'Too Many Requests', 500: 'Internal Server Error', 504: 'Gateway Timeout',
};

export async function request<T = any>(method: string, url: string, body?: unknown, opts: { silentAuth?: boolean } = {}): Promise<ApiResult<T>> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  const started = performance.now();
  let res: Response;
  const base: Omit<ApiCall, 'status' | 'statusText' | 'responseHeaders' | 'responseBody' | 'durationMs' | 'ok'> = {
    id: ++seq,
    method,
    url,
    requestHeaders: headers,
    requestBody: isForm ? describeForm(body as FormData) : body ?? null,
    at: new Date().toISOString(),
  };
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    const call: ApiCall = { ...base, status: 0, statusText: 'Network Error', responseHeaders: {}, responseBody: null, durationMs: Math.round(performance.now() - started), ok: false };
    apiLog.push(call);
    throw new ApiError(0, { success: false, errorCode: 'NETWORK_ERROR', message: 'Network error — unable to reach the ParaBank server. Check your connection and try again.' }, call);
  }
  const text = await res.text();
  let json: any = null;
  let parseFailed = false;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      parseFailed = true;
      json = text;
    }
  }
  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => (responseHeaders[k] = v));
  const call: ApiCall = {
    ...base,
    status: res.status,
    statusText: res.statusText || STATUS_TEXT[res.status] || '',
    responseHeaders,
    responseBody: json,
    durationMs: Math.round(performance.now() - started),
    ok: res.ok && !parseFailed,
  };
  apiLog.push(call);

  if (parseFailed) {
    throw new ApiError(res.status, { success: false, errorCode: 'INVALID_JSON', message: 'The server returned a response that is not valid JSON.' }, call);
  }
  if (!res.ok) {
    if (res.status === 401 && !opts.silentAuth && ['SESSION_EXPIRED', 'INVALID_TOKEN', 'UNAUTHORIZED'].includes(json?.errorCode) && !json?.simulated) {
      window.dispatchEvent(new CustomEvent('parabank:unauthorized', { detail: json }));
    }
    throw new ApiError(res.status, json, call);
  }
  return { data: json as T, call };
}

function describeForm(fd: FormData) {
  const out: Record<string, unknown> = {};
  fd.forEach((v, k) => {
    out[k] = v instanceof File ? { fileName: v.name, size: v.size, type: v.type } : v;
  });
  return out;
}

export const api = {
  get: <T = any>(url: string, opts?: { silentAuth?: boolean }) => request<T>('GET', url, undefined, opts),
  post: <T = any>(url: string, body?: unknown, opts?: { silentAuth?: boolean }) => request<T>('POST', url, body ?? {}, opts),
  put: <T = any>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {}),
  patch: <T = any>(url: string, body?: unknown) => request<T>('PATCH', url, body ?? {}),
  del: <T = any>(url: string) => request<T>('DELETE', url),
};

export function qs(params: Record<string, string | number | undefined | null | boolean>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}
