'use client';

import { useEffect, useState } from 'react';
import { betaAccessStatuses, betaStatusLabel } from '@/lib/beta-access';

type BetaUser = { id: string; displayName?: string | null; anonymousDisplayName?: string | null; role: string; betaStatus: string };

export function BetaUsersPanel() {
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');

  const load = async (filter = status) => {
    const response = await fetch(`/api/admin/beta-users${filter ? `?status=${filter}` : ''}`, { cache: 'no-store' }).catch(() => null);
    const data = response ? await response.json() as { users?: BetaUser[]; error?: string } : {};
    if (!response?.ok) return setMessage(data.error ?? 'Could not load beta users.');
    setUsers(data.users ?? []);
    setMessage('');
  };

  useEffect(() => {
    void fetch('/api/admin/beta-users', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { users?: BetaUser[] }) => setUsers(data.users ?? []))
      .catch(() => setMessage('Could not load beta users.'));
  }, []);

  const update = async (userId: string, nextStatus: string) => {
    const response = await fetch('/api/admin/beta-users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, status: nextStatus }) }).catch(() => null);
    const data = response ? await response.json() as { error?: string } : {};
    if (!response?.ok) return setMessage(data.error ?? 'Could not update beta access.');
    setMessage('Beta access updated.');
    await load();
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        <select aria-label="Filter beta users by status" className={fieldClass} onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="">All beta statuses</option>
          {betaAccessStatuses.map((item) => <option key={item} value={item}>{betaStatusLabel(item)}</option>)}
        </select>
        <button className="button-secondary px-4 py-2" onClick={() => load()} type="button">Apply filter</button>
      </div>
      {message && <p aria-live="polite" className="text-sm font-semibold text-iris">{message}</p>}
      {users.map((user) => (
        <article className="content-solid rounded-2xl border border-line p-4" key={user.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">{user.displayName ?? user.anonymousDisplayName ?? 'Yorai member'}</h2>
              <p className="mt-1 text-sm text-ink/60">{user.role.replaceAll('_', ' ')} · {betaStatusLabel(user.betaStatus)}</p>
            </div>
            <select aria-label="Change beta access status" className={fieldClass} onChange={(event) => update(user.id, event.target.value)} value={user.betaStatus}>
              {betaAccessStatuses.map((item) => <option key={item} value={item}>{betaStatusLabel(item)}</option>)}
            </select>
          </div>
        </article>
      ))}
    </div>
  );
}

const fieldClass = 'rounded-xl border border-line bg-surface/82 px-3 py-2.5 text-sm text-ink';
