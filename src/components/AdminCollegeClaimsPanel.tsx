'use client';

import { FormEvent, useEffect, useState } from 'react';

type Claim = {
  id: string; collegeName: string; institutionalEmail: string; roleOrDepartment: string; reason: string; sourceInfo?: string | null; status: string; createdAt: string;
  requester: { displayName?: string | null; anonymousDisplayName?: string | null; name: string; role: string };
  college?: { name: string } | null;
};
type Correction = {
  id: string; fieldName: string; proposedValue: string; sourceUrl?: string | null; sourceInfo?: string | null; status: string; createdAt: string;
  requester: { displayName?: string | null; anonymousDisplayName?: string | null; name: string; role: string };
  college: { name: string };
};
type Data = { claims: Claim[]; corrections: Correction[] };

export function AdminCollegeClaimsPanel() {
  const [data, setData] = useState<Data>({ claims: [], corrections: [] });
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await fetch('/api/admin/college-claims', { cache: 'no-store' }).catch(() => null);
    const result = response ? await response.json() as Partial<Data> & { error?: string } : null;
    if (!response?.ok || !result) return setMessage(result?.error ?? 'Could not load representative queues.');
    setData({ claims: result.claims ?? [], corrections: result.corrections ?? [] });
  };
  useEffect(() => {
    let active = true;
    void fetch('/api/admin/college-claims', { cache: 'no-store' })
      .then((response) => response.json().then((result) => ({ response, result: result as Partial<Data> & { error?: string } })))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) setMessage(result.error ?? 'Could not load representative queues.');
        else setData({ claims: result.claims ?? [], corrections: result.corrections ?? [] });
      })
      .catch(() => { if (active) setMessage('Could not load representative queues.'); });
    return () => { active = false; };
  }, []);

  const update = async (type: 'claim' | 'correction', id: string, status: string, adminNote?: string) => {
    setMessage('');
    const response = await fetch('/api/admin/college-claims', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id, status, adminNote }) }).catch(() => null);
    const result = response ? await response.json() as { error?: string } : {};
    if (!response?.ok) return setMessage(result.error ?? 'Could not update this request.');
    setMessage('Queue updated.');
    await load();
  };

  return (
    <div className="grid gap-6">
      {message && <p className="text-sm font-semibold text-iris" aria-live="polite">{message}</p>}
      <section className="content-solid rounded-3xl border border-line p-5">
        <h2 className="font-semibold text-ink">Representative requests</h2>
        <div className="mt-4 grid gap-3">
          {data.claims.length === 0 ? <p className="text-sm text-ink/60">No representative requests.</p> : data.claims.map((claim) => (
            <QueueCard key={claim.id} title={claim.collegeName} meta={`${claim.status.replaceAll('_', ' ')} · ${labelFor(claim.requester)} · ${claim.institutionalEmail}`} body={`${claim.roleOrDepartment}: ${claim.reason}`} source={claim.sourceInfo} statuses={['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVOKED']} onSubmit={(status, note) => update('claim', claim.id, status, note)} />
          ))}
        </div>
      </section>
      <section className="content-solid rounded-3xl border border-line p-5">
        <h2 className="font-semibold text-ink">Official correction requests</h2>
        <p className="mt-2 text-xs leading-5 text-ink/55">Approving a request records review status only. Published college metadata is changed separately after source review.</p>
        <div className="mt-4 grid gap-3">
          {data.corrections.length === 0 ? <p className="text-sm text-ink/60">No correction requests.</p> : data.corrections.map((correction) => (
            <QueueCard key={correction.id} title={`${correction.college.name} · ${correction.fieldName}`} meta={`${correction.status.replaceAll('_', ' ')} · ${labelFor(correction.requester)}`} body={correction.proposedValue} source={correction.sourceUrl ?? correction.sourceInfo} statuses={['UNDER_REVIEW', 'APPROVED', 'NEEDS_SOURCE', 'REJECTED']} onSubmit={(status, note) => update('correction', correction.id, status, note)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function QueueCard({ title, meta, body, source, statuses, onSubmit }: { title: string; meta: string; body: string; source?: string | null; statuses: string[]; onSubmit: (status: string, note?: string) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit(String(form.get('status')), String(form.get('adminNote') ?? ''));
    event.currentTarget.reset();
  };
  return (
    <article className="rounded-2xl bg-mist/65 p-4">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-xs text-ink/55">{meta}</p>
      <p className="mt-3 text-sm leading-6 text-ink/68">{body}</p>
      {source && <p className="mt-2 text-xs text-ink/55">Source: {source}</p>}
      <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={submit}>
        <select className={fieldClass} name="status">{statuses.map((status) => <option key={status}>{status}</option>)}</select>
        <input className={fieldClass} name="adminNote" placeholder="Moderator/admin note optional" />
        <button className="button-secondary px-3 py-2 text-xs">Update</button>
      </form>
    </article>
  );
}

function labelFor(user: Claim['requester']) {
  return `${user.displayName ?? user.anonymousDisplayName ?? user.name} · ${user.role.replaceAll('_', ' ')}`;
}

const fieldClass = 'rounded-xl border border-line bg-surface/80 px-3 py-2 text-sm text-ink';
