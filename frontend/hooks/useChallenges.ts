import { useCallback, useSyncExternalStore } from 'react';
import { STORAGE } from './useAuth';

const listeners = new Set<() => void>();
let cache: { raw: string | null; set: Set<number> } = { raw: null, set: new Set() };

function read(): Set<number> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE.challenges);
  } catch {
    /* storage unavailable */
  }
  if (raw !== cache.raw) {
    let ids: number[] = [];
    try {
      ids = JSON.parse(raw ?? '[]');
    } catch {
      ids = [];
    }
    cache = { raw, set: new Set(ids) };
  }
  return cache.set;
}

function write(set: Set<number>) {
  localStorage.setItem(STORAGE.challenges, JSON.stringify([...set].sort((a, b) => a - b)));
  listeners.forEach((l) => l());
}

/** Challenge completion is stored in localStorage (`parabank.challenges.completed`). */
export function useChallengeProgress() {
  const completed = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      window.addEventListener('storage', l);
      return () => {
        listeners.delete(l);
        window.removeEventListener('storage', l);
      };
    },
    read,
  );
  const toggle = useCallback((id: number) => {
    const next = new Set(read());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    write(next);
  }, []);
  const reset = useCallback(() => write(new Set()), []);
  return { completed, toggle, reset };
}
