import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ALL_CHALLENGES, LEVELS, type Level } from '@challenges/index';
import { useChallengeProgress } from '../../hooks/useChallenges';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError, type ApiCall } from '../../services/api';
import { ApiResponsePanel } from '../../components/ApiResponsePanel';
import { PageHeader, Spinner } from '../../components/ui';
import { cx, dateTime } from '../../utils/format';

const CATEGORY_GROUPS: Array<[string, string[]]> = [
  ['iFrame Challenges', ['iFrames']],
  ['Dialog Challenges', ['Dialogs']],
  ['Popup Challenges', ['Popups & Windows']],
  ['API Challenges', ['API']],
  ['Network Challenges', ['Network']],
  ['Table Challenges', ['Tables']],
  ['Auth & Session', ['Authentication']],
  ['Files', ['Files']],
];

const LEVEL_COLOR: Record<Level, string> = { beginner: 'bg-emerald-500', intermediate: 'bg-sky-500', advanced: 'bg-violet-500', expert: 'bg-rose-500' };

export function LabHomePage() {
  const { completed, reset } = useChallengeProgress();
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [call, setCall] = useState<ApiCall | null>(null);
  const [info, setInfo] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  const loadMeta = () => {
    api.get('/api/lab/info').then((r) => setInfo(r.data)).catch(() => {});
    api.get('/api/auth/session').then((r) => setSession(r.data.session)).catch(() => {});
  };
  useEffect(loadMeta, []);

  const total = ALL_CHALLENGES.length;
  const done = ALL_CHALLENGES.filter((c) => completed.has(c.id)).length;

  const action = async (key: string, url: string, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setBusy(key);
    try {
      const res = await api.post(url);
      setCall(res.call);
      toast('success', res.data.message);
      loadMeta();
      if (key === 'expire') setTimeout(() => refresh(), 400);
    } catch (e) {
      setCall((e as ApiError).call);
      toast('error', 'Action failed', (e as ApiError).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="Automation Lab" subtitle="Your Playwright practice progress and practice-environment controls" />

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-6 xl:col-span-2" aria-labelledby="progress-h">
          <div className="flex items-center justify-between">
            <h2 id="progress-h" className="font-semibold text-slate-900">
              Playwright Progress
            </h2>
            <p className="text-sm text-slate-600" data-testid="challenges-completed">
              Challenges Completed: <strong>{done}</strong> / {total}
            </p>
          </div>
          <div className="mt-5 space-y-4">
            {LEVELS.map((level) => {
              const list = ALL_CHALLENGES.filter((c) => c.level === level);
              const n = list.filter((c) => completed.has(c.id)).length;
              const pct = Math.round((n / list.length) * 100);
              return (
                <Link key={level} to={`/challenges/${level}`} className="block" data-testid={`progress-${level}`}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium capitalize text-slate-700">{level}</span>
                    <span className="tabular text-slate-500">
                      {n}/{list.length} · {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${level} progress`}>
                    <div className={cx('h-full rounded-full transition-all', LEVEL_COLOR[level])} style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORY_GROUPS.map(([label, cats]) => {
              const list = ALL_CHALLENGES.filter((c) => cats.includes(c.category));
              const n = list.filter((c) => completed.has(c.id)).length;
              return (
                <div key={label} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="tabular mt-1 text-lg font-bold text-slate-900">
                    {n}
                    <span className="text-sm font-medium text-slate-400"> / {list.length}</span>
                  </p>
                </div>
              );
            })}
          </div>
          <button
            className="btn-ghost btn-sm mt-4 text-slate-500"
            onClick={() => {
              if (window.confirm('Clear your challenge progress? (Stored in localStorage)')) reset();
            }}
          >
            Reset progress
          </button>
        </section>

        <section className="card p-6" aria-labelledby="data-h">
          <h2 id="data-h" className="font-semibold text-slate-900">
            Practice Data
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Seed: <span className="code">{info?.seed?.seed ?? '…'}</span> {info?.seed?.random ? '(random)' : '(canonical)'}
            <br />
            Last seeded {dateTime(info?.seed?.at)}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button className="btn-secondary" disabled={!!busy} onClick={() => action('reset', '/api/lab/reset', 'Reset all practice data to the original seed?')}>
              {busy === 'reset' && <Spinner />}Reset Practice Data
            </button>
            <button className="btn-secondary" disabled={!!busy} onClick={() => action('generate', '/api/lab/generate', 'Generate a brand-new randomized dataset? IDs and amounts will change.')}>
              {busy === 'generate' && <Spinner />}Generate New Test Data
            </button>
          </div>
          <h3 className="mt-6 text-sm font-semibold text-slate-900">Session</h3>
          <dl className="mt-2 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <dt>User</dt>
              <dd className="font-mono">{user?.username}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Session ID</dt>
              <dd className="font-mono" data-testid="session-id">
                {session?.id?.slice(0, 14)}…
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Expires</dt>
              <dd>{dateTime(session?.expires_at)}</dd>
            </div>
          </dl>
          <button className="btn-danger btn-sm mt-3 w-full" disabled={!!busy} onClick={() => action('expire', '/api/auth/expire-session', 'Expire your session now? You will be asked to log in again.')}>
            Expire Session
          </button>
        </section>
      </div>

      {info && (
        <section className="card mt-6 p-6" aria-label="Test data reference">
          <h2 className="font-semibold text-slate-900">Test Data Reference</h2>
          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="font-medium">Users</p>
              <ul className="mt-1 space-y-0.5 font-mono text-xs text-slate-600">
                {Object.entries(info.demo)
                  .filter(([, v]: any) => v?.username)
                  .map(([k, v]: any) => (
                    <li key={k}>
                      {v.username} / {v.password}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">OTP</p>
              <p className="font-mono text-xs text-slate-600">{info.demo.otp}</p>
            </div>
            <div>
              <p className="font-medium">Test cards</p>
              <ul className="mt-1 space-y-0.5 font-mono text-xs text-slate-600">
                {Object.entries(info.demo.testCards).map(([k, v]: any) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
      {call && (
        <div className="mt-6">
          <ApiResponsePanel call={call} />
        </div>
      )}
    </div>
  );
}
