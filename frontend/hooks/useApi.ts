import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { api, apiLog, ApiError, type ApiCall } from '../services/api';

/** Fetch JSON from the API with loading / error / reload state. */
export function useApi<T = any>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [call, setCall] = useState<ApiCall | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(url);
      if (id === reqId.current) {
        setData(res.data);
        setCall(res.call);
      }
    } catch (e) {
      if (id === reqId.current) {
        setError(e as ApiError);
        setCall((e as ApiError).call ?? null);
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load, call, setData };
}

export function useApiLog() {
  return useSyncExternalStore(apiLog.subscribe, apiLog.getSnapshot);
}

/** Registers a real `beforeunload` handler while `when` is true. */
export function useBeforeUnload(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an unsaved transfer. Are you sure you want to leave?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);
}

/** Listens for postMessage events coming from gateway iframes / popups. */
export function usePaymentMessages(onMessage: (data: any) => void) {
  const ref = useRef(onMessage);
  ref.current = onMessage;
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'parabank:payment') ref.current(e.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
}
