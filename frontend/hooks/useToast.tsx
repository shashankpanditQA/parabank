import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cx } from '../utils/format';

type Kind = 'success' | 'error' | 'info' | 'warning';
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  message?: string;
}

const ToastContext = createContext<(kind: Kind, title: string, message?: string) => void>(() => {});

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((kind: Kind, title: string, message?: string) => {
    const id = ++nextId;
    setToasts((t) => [...t, { id, kind, title, message }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 6000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            data-testid={`${t.kind === 'error' ? 'error' : t.kind}-toast`}
            className={cx(
              'toast-in pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-lg',
              t.kind === 'success' && 'border-emerald-200',
              t.kind === 'error' && 'border-red-200',
              t.kind === 'info' && 'border-sky-200',
              t.kind === 'warning' && 'border-amber-200',
            )}
          >
            <span
              className={cx(
                'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white',
                t.kind === 'success' && 'bg-emerald-500',
                t.kind === 'error' && 'bg-red-500',
                t.kind === 'info' && 'bg-sky-500',
                t.kind === 'warning' && 'bg-amber-500',
              )}
              aria-hidden
            >
              {t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.message && <p className="mt-0.5 break-words text-sm text-slate-600">{t.message}</p>}
            </div>
            <button className="text-slate-400 hover:text-slate-600" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
