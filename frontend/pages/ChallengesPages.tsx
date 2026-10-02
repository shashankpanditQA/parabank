import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ALL_CHALLENGES, LEVEL_INFO, LEVELS, type Level } from '@challenges/index';
import { useChallengeProgress } from '../hooks/useChallenges';
import { Badge, EmptyState, PageHeader } from '../components/ui';
import { cx } from '../utils/format';

const LEVEL_TONE: Record<Level, 'brand' | 'sky' | 'violet' | 'red'> = { beginner: 'brand', intermediate: 'sky', advanced: 'violet', expert: 'red' };

export function ChallengesListPage() {
  const { level = 'beginner' } = useParams();
  const { completed, toggle } = useChallengeProgress();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const lvl = level as Level;
  const list = useMemo(() => ALL_CHALLENGES.filter((c) => c.level === lvl), [lvl]);
  if (!LEVELS.includes(lvl)) return <Navigate to="/challenges/beginner" replace />;
  const categories = [...new Set(list.map((c) => c.category))];
  const shown = list.filter(
    (c) => (!category || c.category === category) && (!search || `${c.id} ${c.title} ${c.skills.join(' ')} ${c.description}`.toLowerCase().includes(search.toLowerCase())),
  );
  const done = list.filter((c) => completed.has(c.id)).length;

  return (
    <div>
      <PageHeader title={`${LEVEL_INFO[lvl].title} Challenges`} subtitle={LEVEL_INFO[lvl].blurb} actions={<Badge tone={LEVEL_TONE[lvl]}>{done} / {list.length} completed</Badge>} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Difficulty">
        {LEVELS.map((l) => (
          <Link key={l} to={`/challenges/${l}`} role="tab" aria-selected={l === lvl} className={cx('rounded-full px-4 py-1.5 text-sm font-semibold capitalize', l === lvl ? 'bg-navy-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}>
            {l}
          </Link>
        ))}
      </div>
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="ch-search" className="label">
            Search challenges
          </label>
          <input id="ch-search" className="input" placeholder="Title, skill or keyword" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ch-category" className="label">
            Category
          </label>
          <select id="ch-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      {!shown.length ? (
        <EmptyState title="No challenges match" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="challenge-list">
          {shown.map((c) => (
            <article key={c.id} className={cx('card flex flex-col p-5', completed.has(c.id) && 'ring-2 ring-emerald-200')} data-testid="challenge-card" aria-label={`Challenge ${c.id}: ${c.title}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">Challenge #{c.id}</span>
                <Badge tone="slate">{c.category}</Badge>
              </div>
              <h2 className="mt-2 font-semibold text-slate-900">
                <Link to={`/challenges/c/${c.id}`} className="hover:text-brand-700 hover:underline">
                  {c.title}
                </Link>
              </h2>
              <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-600">{c.objective}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.skills.slice(0, 4).map((s) => (
                  <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={completed.has(c.id)} onChange={() => toggle(c.id)} />
                  Completed
                </label>
                <Link to={`/challenges/c/${c.id}`} className="btn-secondary btn-sm">
                  Start
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChallengeDetailPage() {
  const { id } = useParams();
  const challenge = ALL_CHALLENGES.find((c) => c.id === Number(id));
  const { completed, toggle } = useChallengeProgress();
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastId, setLastId] = useState(id);
  if (lastId !== id) {
    setLastId(id);
    setHints(0);
    setShowSolution(false);
  }
  if (!challenge) return <EmptyState title="Challenge not found" action={<Link to="/challenges/beginner" className="btn-primary">All challenges</Link>} />;
  const idx = ALL_CHALLENGES.indexOf(challenge);
  const prev = ALL_CHALLENGES[idx - 1];
  const next = ALL_CHALLENGES[idx + 1];
  const done = completed.has(challenge.id);

  const copy = async () => {
    await navigator.clipboard?.writeText(challenge.solution).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <PageHeader
        title={`Challenge #${challenge.id} — ${challenge.title}`}
        subtitle={
          <>
            <Link to={`/challenges/${challenge.level}`} className="capitalize hover:underline">
              {challenge.level}
            </Link>{' '}
            · {challenge.category}
          </>
        }
        actions={
          <>
            <Link className="btn-primary" to={challenge.page}>
              Open Practice Page
            </Link>
            <button className={done ? 'btn-secondary' : 'btn-secondary'} onClick={() => toggle(challenge.id)} aria-pressed={done}>
              {done ? '✓ Completed' : 'Mark as Complete'}
            </button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="card p-6" aria-label="Challenge details">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Description</h2>
            <p className="mt-1 text-slate-700">{challenge.description}</p>
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Objective</h2>
            <p className="mt-1 font-medium text-slate-900" data-testid="challenge-objective">
              {challenge.objective}
            </p>
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Expected Result</h2>
            <p className="mt-1 text-slate-700">{challenge.expected}</p>
          </section>

          <section className="card overflow-hidden" aria-label="Solution">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold">Solution</h2>
              <div className="flex gap-2">
                {showSolution && (
                  <button className="btn-ghost btn-sm" onClick={copy}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
                <button className="btn-secondary btn-sm" onClick={() => setShowSolution((s) => !s)} aria-expanded={showSolution}>
                  {showSolution ? 'Hide Solution' : 'Show Solution'}
                </button>
              </div>
            </div>
            {showSolution ? (
              <>
                <pre className="max-h-[36rem] overflow-auto bg-slate-950 p-5 font-mono text-xs leading-relaxed text-slate-100" data-testid="solution-code">
                  {challenge.solution}
                </pre>
                <div className="border-t border-slate-200 p-5">
                  <h3 className="font-semibold">Why this approach?</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {challenge.why.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">Try it yourself first. Reveal hints one by one in the Practice Console before opening the solution.</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-navy-800 bg-navy-900 text-slate-200 shadow-sm" aria-label="Practice console" data-testid="practice-console">
            <div className="border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">Practice Console</div>
            <div className="space-y-4 p-5 text-sm">
              <div>
                <p className="text-xs text-slate-400">Current Challenge</p>
                <p className="font-semibold text-white">
                  #{challenge.id} {challenge.title}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Difficulty</p>
                <p className="font-semibold capitalize text-white" data-testid="challenge-difficulty">
                  {challenge.level}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Skills</p>
                <ul className="mt-1 space-y-0.5" data-testid="challenge-skills">
                  {challenge.skills.map((s) => (
                    <li key={s} className="font-mono text-xs">
                      <span className="text-brand-500">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-slate-400">Hints</p>
                <ol className="mt-1 space-y-2">
                  {challenge.hints.map((h, i) => (
                    <li key={i} data-testid={`hint-${i + 1}`}>
                      {i < hints ? (
                        <p className="rounded-lg bg-white/5 p-2 text-xs leading-relaxed">
                          <span className="font-bold text-brand-500">Hint {i + 1}:</span> {h}
                        </p>
                      ) : i === hints ? (
                        <button className="w-full rounded-lg border border-dashed border-white/20 px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-white/5" onClick={() => setHints(i + 1)}>
                          Reveal Hint {i + 1}
                        </button>
                      ) : (
                        <p className="px-3 py-1 text-xs text-slate-500">Hint {i + 1} (locked)</p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
          <nav className="flex justify-between gap-2" aria-label="Challenge navigation">
            {prev ? (
              <Link className="btn-secondary btn-sm" to={`/challenges/c/${prev.id}`}>
                ← #{prev.id}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link className="btn-secondary btn-sm" to={`/challenges/c/${next.id}`}>
                #{next.id} →
              </Link>
            )}
          </nav>
        </aside>
      </div>
    </div>
  );
}
