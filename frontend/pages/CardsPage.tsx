import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { api, ApiError, type ApiCall } from '../services/api';
import { ApiResponsePanel } from '../components/ApiResponsePanel';
import { ErrorState, Field, Modal, PageHeader, StatusBadge, Spinner, Skeleton } from '../components/ui';
import { cx, date, money } from '../utils/format';

type Dialog = null | { kind: 'view' | 'pin' | 'limit'; card: any } | { kind: 'new' };

export function CardsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/api/cards');
  const accounts = useApi('/api/accounts');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [call, setCall] = useState<ApiCall | null>(null);

  const run = async (card: any, fn: () => Promise<{ data: any; call: ApiCall }>) => {
    setBusyId(card.cardId);
    try {
      const res = await fn();
      setCall(res.call);
      toast('success', res.data.message);
      reload();
    } catch (e) {
      const err = e as ApiError;
      setCall(err.call);
      toast('error', 'Card action failed', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const reportLost = (card: any) => {
    if (!window.confirm(`Report card ${card.maskedNumber} as lost? This permanently blocks the card.`)) return;
    run(card, () => api.post(`/api/cards/${card.cardId}/report-lost`));
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title="Cards"
        subtitle="Manage debit and credit cards"
        actions={
          <button className="btn-primary" onClick={() => setDialog({ kind: 'new' })}>
            Request New Card
          </button>
        }
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="cards-grid">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)
          : data.data.map((card: any) => {
              const blocked = card.status === 'LOST';
              return (
                <article key={card.cardId} className="card overflow-hidden" data-testid="card-item" aria-label={`${card.cardType} card ending ${card.last4}`}>
                  <div className={cx('relative m-4 h-44 rounded-2xl p-5 text-white shadow-lg', card.cardType === 'CREDIT' ? 'bg-gradient-to-br from-slate-800 to-slate-950' : 'bg-gradient-to-br from-navy-800 to-brand-700', (card.status === 'FROZEN' || blocked) && 'grayscale')}>
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest">
                      <span>{card.cardType} card</span>
                      <span>{card.network}</span>
                    </div>
                    <p className="mt-8 font-mono text-lg tracking-widest" data-testid="card-number">
                      {card.maskedNumber}
                    </p>
                    <div className="mt-4 flex justify-between text-xs">
                      <span>{card.holderName}</span>
                      <span>EXP {card.expiry}</span>
                    </div>
                    {card.status === 'FROZEN' && <span className="absolute right-4 top-12 rounded bg-white/90 px-2 py-0.5 text-xs font-bold text-cyan-700">❄ FROZEN</span>}
                  </div>
                  <div className="flex items-center justify-between px-5">
                    <StatusBadge status={card.status} testId="card-status" />
                    <span className="text-xs text-slate-500">Limit {money(card.spendingLimit)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50 p-4">
                    <button className="btn-secondary btn-sm" onClick={() => setDialog({ kind: 'view', card })}>
                      View Card
                    </button>
                    {card.status === 'FROZEN' ? (
                      <button className="btn-secondary btn-sm" disabled={busyId === card.cardId} onClick={() => run(card, () => api.patch(`/api/cards/${card.cardId}/unfreeze`))}>
                        Unfreeze Card
                      </button>
                    ) : (
                      <button className="btn-secondary btn-sm" disabled={blocked || busyId === card.cardId} onClick={() => run(card, () => api.patch(`/api/cards/${card.cardId}/freeze`))}>
                        Freeze Card
                      </button>
                    )}
                    <button className="btn-secondary btn-sm" disabled={blocked} onClick={() => setDialog({ kind: 'pin', card })}>
                      Change PIN
                    </button>
                    <button className="btn-secondary btn-sm" disabled={blocked} onClick={() => setDialog({ kind: 'limit', card })}>
                      Set Spending Limit
                    </button>
                    <button className="btn-sm btn-ghost text-red-600" disabled={blocked} onClick={() => reportLost(card)}>
                      Report Lost Card
                    </button>
                  </div>
                </article>
              );
            })}
      </div>
      {call && (
        <div className="mt-6">
          <ApiResponsePanel call={call} />
        </div>
      )}

      {dialog?.kind === 'view' && (
        <Modal open title="Card Details" onClose={() => setDialog(null)} testId="card-details-modal">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Card ID', dialog.card.cardId],
              ['Card Number', dialog.card.maskedNumber],
              ['Type', dialog.card.cardType],
              ['Network', dialog.card.network],
              ['Linked Account', dialog.card.accountId],
              ['Expiry', dialog.card.expiry],
              ['Status', dialog.card.status],
              ['Spending Limit', money(dialog.card.spendingLimit)],
              ['PIN Set', dialog.card.pinSet ? 'Yes' : 'No'],
              ['Issued', date(dialog.card.createdAt)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {dialog?.kind === 'pin' && <PinModal card={dialog.card} onClose={() => setDialog(null)} onDone={(c) => { setCall(c); setDialog(null); reload(); }} />}
      {dialog?.kind === 'limit' && <LimitModal card={dialog.card} onClose={() => setDialog(null)} onDone={(c) => { setCall(c); setDialog(null); reload(); }} />}
      {dialog?.kind === 'new' && <NewCardModal accounts={accounts.data?.data ?? []} onClose={() => setDialog(null)} onDone={(c) => { setCall(c); setDialog(null); reload(); }} />}
    </div>
  );
}

function useSubmit(onDone: (c: ApiCall) => void, successTitle: string) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async (fn: () => Promise<{ data: any; call: ApiCall }>) => {
    setBusy(true);
    setErrors({});
    try {
      const res = await fn();
      toast('success', successTitle, res.data.message);
      onDone(res.call);
    } catch (e) {
      const err = e as ApiError;
      setErrors({ ...err.fieldErrors, form: err.message });
    } finally {
      setBusy(false);
    }
  };
  return { busy, errors, submit };
}

function PinModal({ card, onClose, onDone }: { card: any; onClose: () => void; onDone: (c: ApiCall) => void }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const { busy, errors, submit } = useSubmit(onDone, 'PIN updated');
  return (
    <Modal
      open
      title={`Change PIN · ${card.maskedNumber}`}
      onClose={onClose}
      testId="pin-modal"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy} onClick={() => submit(() => api.patch(`/api/cards/${card.cardId}/pin`, { pin, confirmPin }))}>
            {busy && <Spinner />}Update PIN
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {errors.form && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errors.form}</p>}
        <Field label="New PIN" htmlFor="new-pin" error={errors.pin}>
          <input id="new-pin" type="password" inputMode="numeric" maxLength={4} className="input font-mono" value={pin} onChange={(e) => setPin(e.target.value)} />
        </Field>
        <Field label="Confirm PIN" htmlFor="confirm-pin" error={errors.confirmPin}>
          <input id="confirm-pin" type="password" inputMode="numeric" maxLength={4} className="input font-mono" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function LimitModal({ card, onClose, onDone }: { card: any; onClose: () => void; onDone: (c: ApiCall) => void }) {
  const [limit, setLimit] = useState(String(card.spendingLimit));
  const { busy, errors, submit } = useSubmit(onDone, 'Limit updated');
  return (
    <Modal
      open
      title="Set Spending Limit"
      onClose={onClose}
      testId="limit-modal"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy} onClick={() => submit(() => api.patch(`/api/cards/${card.cardId}/limit`, { spendingLimit: Number(limit) }))}>
            {busy && <Spinner />}Save Limit
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {errors.form && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errors.form}</p>}
        <Field label="Monthly Spending Limit" htmlFor="spend-limit" error={errors.spendingLimit} hint="Between $100 and $50,000">
          <input id="spend-limit" type="number" className="input" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </Field>
        <input type="range" min={100} max={50000} step={100} value={Number(limit) || 100} onChange={(e) => setLimit(e.target.value)} className="w-full accent-brand-600" aria-label="Spending limit slider" />
      </div>
    </Modal>
  );
}

function NewCardModal({ accounts, onClose, onDone }: { accounts: any[]; onClose: () => void; onDone: (c: ApiCall) => void }) {
  const [cardType, setCardType] = useState('DEBIT');
  const eligible = accounts.filter((a) => (cardType === 'CREDIT' ? a.accountType === 'CREDIT' : a.accountType !== 'CREDIT'));
  const [accountId, setAccountId] = useState('');
  const { busy, errors, submit } = useSubmit(onDone, 'Card issued');
  return (
    <Modal
      open
      title="Request New Card"
      onClose={onClose}
      testId="new-card-modal"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy} onClick={() => submit(() => api.post('/api/cards', { cardType, accountId: accountId || eligible[0]?.accountNumber }))}>
            {busy && <Spinner />}Request Card
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {errors.form && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errors.form}</p>}
        <fieldset>
          <legend className="label">Card Type</legend>
          <div className="flex gap-4">
            {['DEBIT', 'CREDIT'].map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input type="radio" name="cardType" checked={cardType === t} onChange={() => { setCardType(t); setAccountId(''); }} className="accent-brand-600" />
                {t === 'DEBIT' ? 'Debit Card' : 'Credit Card'}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Linked Account" htmlFor="card-account" error={errors.accountId}>
          <select id="card-account" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {eligible.map((a) => (
              <option key={a.accountNumber} value={a.accountNumber}>
                {a.accountNumber}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
