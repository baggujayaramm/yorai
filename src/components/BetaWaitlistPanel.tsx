'use client';

import { useEffect, useState } from 'react';

type WaitlistEntry = { id: string; name: string; email: string; collegeInterest?: string | null; reason?: string | null; status: string; internalNote?: string | null };

export function BetaWaitlistPanel() {
  const [items, setItems] = useState<WaitlistEntry[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const load = async () => {
    const response = await fetch('/api/beta/waitlist', { cache: 'no-store' }).catch(() => null);
    const data = response ? await response.json() as { entries?: WaitlistEntry[]; error?: string } : {};
    if (!response?.ok) return setMessage(data.error ?? 'Could not load the beta waitlist.');
    setItems(data.entries ?? []);
  };

  useEffect(() => {
    void fetch('/api/beta/waitlist', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { entries?: WaitlistEntry[] }) => setItems(data.entries ?? []))
      .catch(() => setMessage('Could not load the beta waitlist.'));
  }, []);

  const update = async (entry: WaitlistEntry, status: string) => {
    setMessage('');
    setInviteCode('');
    const response = await fetch('/api/beta/waitlist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, status, internalNote: notes[entry.id] ?? entry.internalNote ?? '' }),
    }).catch(() => null);
    const data = response ? await response.json() as { code?: string; error?: string } : {};
    if (!response?.ok) return setMessage(data.error ?? 'Could not update this waitlist entry.');
    setMessage(status === 'INVITED' ? 'Invite issued. The code is shown once below.' : 'Waitlist entry updated.');
    setInviteCode(data.code ?? '');
    await load();
  };

  return (
    <div className="grid gap-4">
      {message && <p aria-live="polite" className="text-sm font-semibold text-iris">{message}</p>}
      {inviteCode && <p className="rounded-2xl bg-leaf/10 p-4 font-mono text-sm text-leaf">New code, shown once: {inviteCode}</p>}
      {items.map((entry) => (
        <article className="content-solid rounded-2xl border border-line p-4" key={entry.id}>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-iris"><span>{entry.status}</span>{entry.collegeInterest && <span>{entry.collegeInterest}</span>}</div>
          <h2 className="mt-2 font-semibold text-ink">{entry.name}</h2>
          <p className="text-sm text-ink/60">{entry.email}</p>
          {entry.reason && <p className="mt-2 text-sm text-ink/70">{entry.reason}</p>}
          <label className="mt-3 grid gap-1 text-xs font-semibold text-ink/65">
            Private internal note
            <textarea className="min-h-20 rounded-xl border border-line bg-surface/82 px-3 py-2 text-sm font-normal text-ink" defaultValue={entry.internalNote ?? ''} maxLength={1000} onChange={(event) => setNotes((current) => ({ ...current, [entry.id]: event.target.value }))} />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.status !== 'APPROVED' && entry.status !== 'INVITED' && <button className="button-secondary px-3 py-2 text-xs" onClick={() => update(entry, 'APPROVED')} type="button">Approve</button>}
            {entry.status !== 'REJECTED' && entry.status !== 'INVITED' && <button className="button-secondary px-3 py-2 text-xs" onClick={() => update(entry, 'REJECTED')} type="button">Reject</button>}
            {entry.status !== 'INVITED' && <button className="button-primary px-3 py-2 text-xs" onClick={() => update(entry, 'INVITED')} type="button">Issue invite</button>}
          </div>
        </article>
      ))}
    </div>
  );
}
