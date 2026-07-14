'use client';

import { useCallback, useEffect, useState } from 'react';

type Warning = { id: string; reason: string; severity: string; acknowledgedAt: string | null; createdAt: string };
type Restriction = { id: string; type: string; reason: string; expiresAt: string };
type Appeal = { id: string; clarification: string; status: string; resolutionSummary?: string | null; createdAt: string };
type SafetyAction = { id: string; actionType: string; targetType: string; targetId: string; createdAt: string };

export function AccountSafetyPanel() {
  const [data, setData] = useState<{ warnings: Warning[]; restrictions: Restriction[]; appeals: Appeal[]; actions: SafetyAction[] }>({ warnings: [], restrictions: [], appeals: [], actions: [] });
  const [clarifications, setClarifications] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/account-safety', { cache: 'no-store' }).catch(() => null);
    const body = response ? await response.json() as typeof data & { error?: string } : null;
    if (!response?.ok || !body) return setError(body?.error ?? 'Could not load private safety notices.');
    setData({ warnings: body.warnings ?? [], restrictions: body.restrictions ?? [], appeals: body.appeals ?? [], actions: body.actions ?? [] }); setError('');
  }, []);
  useEffect(() => {
    void fetch('/api/account-safety', { cache: 'no-store' })
      .then((response) => response.json() as Promise<typeof data & { error?: string }>)
      .then((body) => setData({ warnings: body.warnings ?? [], restrictions: body.restrictions ?? [], appeals: body.appeals ?? [], actions: body.actions ?? [] }))
      .catch(() => setError('Could not load private safety notices.'));
  }, []);
  const acknowledge = async (warningId: string) => { const response = await fetch('/api/account-safety', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ warningId }) }); if (response.ok) await load(); };
  const clarify = async (moderationActionId: string) => {
    const response = await fetch('/api/account-safety', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moderationActionId, clarification: clarifications[moderationActionId] }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) return setError(body.error ?? 'Could not submit this clarification.');
    await load();
  };

  return <div className="grid gap-5">
    {error && <p aria-live="assertive" className="rounded-xl bg-sun/10 p-3 text-sm text-sun" role="alert">{error}</p>}
    <SafetySection title="Private guidance notices" empty="No private community guidance notices.">{data.warnings.map((item) => <article className="rounded-xl bg-mist/65 p-4" key={item.id}><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-ink">{item.severity.toLowerCase()} guidance</strong><span className="text-xs text-ink/50">{new Date(item.createdAt).toLocaleDateString()}</span></div><p className="mt-2 text-sm leading-6 text-ink/70">{item.reason}</p>{!item.acknowledgedAt && <button className="button-secondary mt-3 px-4 py-2 text-xs" onClick={() => acknowledge(item.id)} type="button">Acknowledge</button>}</article>)}</SafetySection>
    <SafetySection title="Temporary restrictions" empty="No active contribution restrictions.">{data.restrictions.map((item) => <article className="rounded-xl bg-sun/8 p-4" key={item.id}><strong className="text-sm text-ink">{item.type.toLowerCase()} restriction</strong><p className="mt-2 text-sm text-ink/70">{item.reason}</p><p className="mt-2 text-xs text-ink/50">Expires {new Date(item.expiresAt).toLocaleString()}</p></article>)}</SafetySection>
    <SafetySection title="Actions affecting your contributions" empty="No moderation actions affect your contributions.">{data.actions.map((item) => <article className="rounded-xl bg-mist/65 p-4" key={item.id}><strong className="text-sm text-ink">{item.actionType.replaceAll(':', ' · ').replaceAll('_', ' ')}</strong><p className="mt-1 text-xs text-ink/50">{item.targetType} · {new Date(item.createdAt).toLocaleDateString()}</p><textarea className="mt-3 min-h-20 w-full rounded-xl border border-line bg-surface/85 p-3 text-sm text-ink" maxLength={1500} onChange={(event) => setClarifications((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Add one respectful clarification or appeal" value={clarifications[item.id] ?? ''} /><button className="button-secondary mt-2 px-4 py-2 text-xs" disabled={(clarifications[item.id]?.trim().length ?? 0) < 20} onClick={() => clarify(item.id)} type="button">Submit clarification</button></article>)}</SafetySection>
    <SafetySection title="Clarifications and appeals" empty="No clarifications submitted.">{data.appeals.map((item) => <article className="rounded-xl bg-mist/65 p-4" key={item.id}><strong className="text-sm text-ink">{item.status.toLowerCase().replace('_', ' ')}</strong><p className="mt-2 text-sm text-ink/70">{item.clarification}</p>{item.resolutionSummary && <p className="mt-2 text-sm text-leaf">{item.resolutionSummary}</p>}</article>)}</SafetySection>
  </div>;
}

function SafetySection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) { return <section className="content-solid rounded-2xl border border-line p-5"><h2 className="font-semibold text-ink">{title}</h2><div className="mt-4 grid gap-3">{children.length ? children : <p className="text-sm text-ink/60">{empty}</p>}</div></section>; }
